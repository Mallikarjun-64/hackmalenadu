from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import uuid
import datetime

from engine.ingestion import UnifiedEvent, normalize_event
from engine.detector import detect_threats
from engine.correlator import correlate_alerts
from engine.explainer import explain_incident
from engine.playbook import generate_playbook
from engine.simulator import run_simulation
from engine.system_monitor import monitor_network, monitor_processes

app = FastAPI(title="HackMalenadu '26 Threat Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory queues and state
event_queue = asyncio.Queue()
global_state = {
    "total_events": 0,
    "alerts": [],
    "incidents": [],
    "clients": [],
    "raw_events": []  # ring buffer of last 200 raw events for Live Monitor
}

async def process_events():
    batch = []
    while True:
        try:
            # Batch process events every 1 second
            while not event_queue.empty() and len(batch) < 1000:
                batch.append(await event_queue.get())
            
            if batch:
                global_state["total_events"] += len(batch)

                # 1. Detect FIRST so we know which events are suspicious
                alerts = detect_threats(batch)
                if alerts:
                    global_state["alerts"].extend(alerts)

                    # 2. Correlate
                    incidents = correlate_alerts(global_state["alerts"])

                    if incidents:
                        # 3. Explain & 4. Playbook
                        for inc in incidents:
                            if inc["incident_id"] not in [i["incident_id"] for i in global_state["incidents"]]:
                                explanation = explain_incident(inc)
                                playbook = generate_playbook(inc)
                                inc["explanation"] = explanation
                                inc["playbook"] = playbook
                                global_state["incidents"].append(inc)

                # Build a set of suspicious event IDs from all alerts for quick lookup
                all_alert_event_ids = {}
                for a in global_state["alerts"]:
                    for eid in a.get("events", []):
                        all_alert_event_ids[eid] = a["alert_id"]

                # Serialize raw events AFTER detection — now we can correctly mark suspicious ones
                raw_serialized = []
                for ev in batch:
                    alert_id = all_alert_event_ids.get(ev.event_id)
                    suspicious = ev.is_malicious or (alert_id is not None) or (ev.attack_type is not None)
                    raw_serialized.append({
                        "event_id": ev.event_id,
                        "timestamp": ev.timestamp.isoformat(),
                        "layer": ev.layer,
                        "action": ev.action,
                        "src_ip": ev.source_ip,
                        "dst_ip": ev.destination_ip,
                        "process": ev.metadata.get("client_type") or ev.metadata.get("process_name") or ev.metadata.get("endpoint"),
                        "status": ev.metadata.get("status_code"),
                        "message": ev.metadata.get("message"),
                        "url": ev.metadata.get("url"),
                        "bytes": ev.bytes_total,
                        "is_malicious": suspicious,
                        "attack_type": ev.attack_type,
                        "alert_id": alert_id
                    })

                # Keep ring buffer at 200
                global_state["raw_events"] = (global_state["raw_events"] + raw_serialized)[-200:]

                # 5. Broadcast every batch
                await broadcast({
                    "type": "update",
                    "incidents": global_state["incidents"],
                    "alerts": global_state["alerts"][-10:],
                    "total_events": global_state["total_events"],
                    "batch_size": len(batch),
                    "raw_events": raw_serialized
                })
                batch = []
            
            await asyncio.sleep(1)
        except Exception as e:
            print(f"Error processing batch: {e}")

async def broadcast(message: dict):
    disconnected = []
    for ws in global_state["clients"]:
        try:
            await ws.send_json(message)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        global_state["clients"].remove(ws)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(process_events())
    asyncio.create_task(monitor_network(event_queue))
    asyncio.create_task(monitor_processes(event_queue))

@app.post("/api/simulation/start/{scenario}")
async def start_simulation(scenario: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_simulation, scenario, event_queue)
    return {"status": "Simulation started", "scenario": scenario}

@app.post("/api/ingest/client-log")
async def ingest_client_log(request: Request):
    data = await request.json()
    
    # Handle both single log and batch list
    logs = data if isinstance(data, list) else [data]
    
    for log_item in logs:
        raw_event = {
            "type": "client_log",
            "raw_id": f"BROWSER-{uuid.uuid4().hex[:8]}",
            "timestamp": log_item.get("timestamp") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "message": log_item.get("message"),
            "level": log_item.get("level", "log"),
            "url": log_item.get("url"),
            "source": log_item.get("source"),
            "src_ip": request.client.host if request.client else "127.0.0.1",
            "is_malicious": False
        }
        await event_queue.put(normalize_event(raw_event))
        
    return {"status": "Events queued", "count": len(logs)}

@app.get("/api/state")
async def get_state():
    return {
        "alerts_count": len(global_state["alerts"]),
        "incidents": global_state["incidents"]
    }

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    global_state["clients"].append(websocket)
    try:
        # Send initial state including raw event history
        await websocket.send_json({
            "type": "init",
            "incidents": global_state["incidents"],
            "alerts": global_state["alerts"][-10:] if global_state["alerts"] else [],
            "total_events": global_state["total_events"],
            "raw_events": global_state["raw_events"]  # full history buffer
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        global_state["clients"].remove(websocket)
