import asyncio
import socket
import psutil
import datetime
from engine.ingestion import normalize_event
import uuid

# Memory deduplication to prevent flooding queue
seen_processes = set()
seen_connections = set()

# Safe IP filter to avoid loopback spam
def is_interesting_ip(ip):
    if not ip or ip.startswith("127.") or ip.startswith("::1"):
        return False
    return True

async def monitor_network(event_queue: asyncio.Queue):
    """
    Polls active network connections via psutil continuously.
    """
    global seen_connections
    while True:
        try:
            conns = psutil.net_connections(kind='inet')
            for c in conns:
                # Capture established outgoing or listening incoming
                if c.status in ['ESTABLISHED', 'SYN_SENT'] and c.raddr:
                    src_ip = c.laddr.ip if c.laddr else None
                    dst_ip = c.raddr.ip if c.raddr else None
                    dst_port = c.raddr.port if c.raddr else None
                    
                    if is_interesting_ip(src_ip) and is_interesting_ip(dst_ip):
                        conn_hash = f"{src_ip}:{dst_ip}:{dst_port}"
                        if conn_hash not in seen_connections:
                            seen_connections.add(conn_hash)
                            
                            # Construct synthetic-compatible network object
                            raw_net = {
                                "raw_id": f"SYS-NET-{uuid.uuid4().hex[:8]}",
                                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                                "type": "network_flow",
                                "src_ip": src_ip,
                                "dst_ip": dst_ip,
                                "src_port": c.laddr.port if c.laddr else 0,
                                "dst_port": dst_port,
                                "protocol": "TCP" if getattr(c, 'type', None) == socket.SOCK_STREAM else "UDP",
                                "bytes_sent": 500, # Mock since psutil per-conn stats are complex
                                "bytes_received": 500,
                                "duration": 1.0,
                                "flags": "S",
                                "packets": 1,
                                "flow_id": "live-host-flow",
                                "is_malicious": False,
                                "attack_type": None
                            }
                            await event_queue.put(normalize_event(raw_net))
                            
        except (psutil.AccessDenied, psutil.Error):
            pass # Ignore permissions issues gently
        
        # Keep set memory capped to avoid endless leak over hours
        if len(seen_connections) > 10000:
            seen_connections.clear()
            
        await asyncio.sleep(2) # Check every 2s

async def monitor_processes(event_queue: asyncio.Queue):
    """
    Polls running OS processes via psutil continuously.
    """
    global seen_processes
    while True:
        # We iterate safely
        for proc in psutil.process_iter(['pid', 'name', 'username']):
            try:
                pid = proc.info['pid']
                p_name = proc.info['name']
                p_user = proc.info['username']
                
                if p_name and pid not in seen_processes:
                    seen_processes.add(pid)
                    
                    # Construct synthetic-compatible endpoint object
                    raw_end = {
                        "raw_id": f"SYS-END-{uuid.uuid4().hex[:8]}",
                        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "type": "endpoint_activity",
                        "hostname": "local-host-system",
                        "process_name": p_name,
                        "parent_pid": 0,
                        "user": p_user or "SYSTEM",
                        "file_path": f"C:\\Windows\\System32\\{p_name}" if "exe" in p_name else f"/bin/{p_name}",
                        "action": "process_start",
                        "registry_key": None,
                        "is_elevated": False,
                        "src_ip": "10.0.1.1", # Default mock mapping for system
                        "is_malicious": False,
                        "attack_type": None
                    }
                    await event_queue.put(normalize_event(raw_end))

            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess, KeyError):
                continue
            
        # Clear daily to re-trigger detections on persistent tasks if needed
        if len(seen_processes) > 5000:
            seen_processes.clear()
            
        await asyncio.sleep(5) # Check every 5s
