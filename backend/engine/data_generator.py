import uuid
import random
import time
from datetime import datetime, timezone

def generate_network_event(is_malicious=False, attack_type=None, src_ip=None, dst_ip=None):
    event = {
        "raw_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "network_flow",
        "src_ip": src_ip or f"10.0.1.{random.randint(10, 200)}",
        "dst_ip": dst_ip or f"10.0.2.{random.randint(10, 200)}",
        "src_port": random.randint(1024, 65535),
        "dst_port": random.choice([80, 443, 22, 3389, 445]),
        "protocol": random.choice(["TCP", "UDP"]),
        "bytes_sent": random.randint(100, 5000),
        "bytes_recv": random.randint(100, 10000),
        "duration": round(random.uniform(0.1, 5.0), 2),
        "flags": ["ACK", "PSH"],
        "is_malicious": is_malicious,
        "attack_type": attack_type
    }

    if attack_type == "brute_force":
        event["dst_port"] = 22
        event["bytes_sent"] = random.randint(40, 100)
        event["duration"] = round(random.uniform(0.01, 0.2), 2)
    elif attack_type == "exfiltration":
        event["bytes_sent"] = random.randint(10000000, 50000000) # 10-50MB
        event["duration"] = round(random.uniform(10.0, 60.0), 2)
    elif attack_type == "c2_beacon":
        event["dst_port"] = 443
        event["bytes_sent"] = random.randint(50, 150)
        event["bytes_recv"] = random.randint(50, 150)
        event["duration"] = round(random.uniform(0.5, 1.5), 2)
    elif attack_type == "lateral_movement":
        event["dst_port"] = random.choice([3389, 445])
    
    return event

def generate_endpoint_event(is_malicious=False, attack_type=None, hostname=None, src_ip=None):
    actions = ["file_read", "file_write", "process_start", "registry_edit"]
    event = {
        "raw_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "endpoint_activity",
        "hostname": hostname or f"desktop-{random.randint(1000, 9999)}",
        "src_ip": src_ip or f"10.0.1.{random.randint(10, 200)}",
        "user": random.choice(["jdoe", "asmith", "ssystem", "admin"]),
        "process_name": random.choice(["chrome.exe", "svchost.exe", "explorer.exe"]),
        "parent_pid": random.randint(100, 9999),
        "pid": random.randint(100, 9999),
        "action": random.choice(actions),
        "is_malicious": is_malicious,
        "attack_type": attack_type
    }

    if attack_type == "exfiltration":
        event["process_name"] = "tar.exe"
        event["action"] = "file_read"
        event["target_path"] = "/opt/data/"
    elif attack_type == "lateral_movement":
        event["process_name"] = "psexec.exe"
        event["action"] = "process_start"
        event["user"] = "admin" # Possible credential theft
    elif attack_type == "c2_beacon":
        event["process_name"] = "powershell.exe"
        event["action"] = "process_start"

    return event

def generate_application_event(is_malicious=False, attack_type=None, src_ip=None):
    event = {
        "raw_id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "type": "application_log",
        "method": random.choice(["GET", "POST", "PUT"]),
        "endpoint": random.choice(["/api/v1/users", "/login", "/dashboard", "/upload"]),
        "status_code": random.choice([200, 201, 301, 401, 403, 404, 500]),
        "src_ip": src_ip or f"10.0.1.{random.randint(10, 200)}",
        "payload_size": random.randint(100, 5000),
        "is_malicious": is_malicious,
        "attack_type": attack_type
    }

    if attack_type == "brute_force":
        event["endpoint"] = "/login"
        event["method"] = "POST"
        event["status_code"] = 401
    elif attack_type == "exfiltration":
        event["endpoint"] = "/api/v1/export"
        event["method"] = "GET"
        event["status_code"] = 200
        event["payload_size"] = random.randint(10000000, 50000000)

    return event
