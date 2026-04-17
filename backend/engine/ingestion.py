from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class UnifiedEvent(BaseModel):
    event_id: str
    timestamp: datetime
    layer: str  # "network" or "endpoint"
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    hostname: Optional[str] = None
    user: Optional[str] = None
    action: str
    protocol: Optional[str] = None
    bytes_total: int = 0
    duration: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_malicious: bool = False
    attack_type: Optional[str] = None

def normalize_event(raw_event: dict) -> UnifiedEvent:
    if raw_event.get("type") == "network_flow":
        return UnifiedEvent(
            event_id=raw_event["raw_id"],
            timestamp=datetime.fromisoformat(raw_event["timestamp"]),
            layer="network",
            source_ip=raw_event.get("src_ip"),
            destination_ip=raw_event.get("dst_ip"),
            action="network_conn",
            protocol=raw_event.get("protocol"),
            bytes_total=raw_event.get("bytes_sent", 0) + raw_event.get("bytes_recv", 0),
            duration=raw_event.get("duration", 0.0),
            metadata={"src_port": raw_event.get("src_port"), "dst_port": raw_event.get("dst_port"), "flags": raw_event.get("flags")},
            is_malicious=raw_event.get("is_malicious", False),
            attack_type=raw_event.get("attack_type")
        )
    elif raw_event.get("type") == "endpoint_activity":
        return UnifiedEvent(
            event_id=raw_event["raw_id"],
            timestamp=datetime.fromisoformat(raw_event["timestamp"]),
            layer="endpoint",
            source_ip=raw_event.get("src_ip"),
            hostname=raw_event.get("hostname"),
            user=raw_event.get("user"),
            action=raw_event.get("action", "activity"),
            metadata={"process_name": raw_event.get("process_name"), "target_path": raw_event.get("target_path")},
            is_malicious=raw_event.get("is_malicious", False),
            attack_type=raw_event.get("attack_type")
        )
    elif raw_event.get("type") == "application_log":
        return UnifiedEvent(
            event_id=raw_event["raw_id"],
            timestamp=datetime.fromisoformat(raw_event["timestamp"]),
            layer="application",
            source_ip=raw_event.get("src_ip"),
            action=raw_event.get("method", "GET"),
            bytes_total=raw_event.get("payload_size", 0),
            metadata={"endpoint": raw_event.get("endpoint"), "status_code": raw_event.get("status_code")},
            is_malicious=raw_event.get("is_malicious", False),
            attack_type=raw_event.get("attack_type")
        )
    elif raw_event.get("type") == "client_log":
        return UnifiedEvent(
            event_id=raw_event["raw_id"],
            timestamp=datetime.fromisoformat(raw_event["timestamp"]),
            layer="application",
            source_ip=raw_event.get("src_ip", "127.0.0.1"),
            action=f"Browser {raw_event.get('level', 'log').upper()}",
            metadata={
                "message": raw_event.get("message"),
                "url": raw_event.get("url"),
                "source": raw_event.get("source"),
                "client_type": "browser_agent"
            },
            is_malicious=raw_event.get("is_malicious", False),
            attack_type=raw_event.get("attack_type")
        )
    else:
        raise ValueError(f"Unknown event type: {raw_event.get('type')}")
