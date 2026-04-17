def generate_playbook(incident: dict) -> dict:
    threat = incident["threat_type"]
    src_ip = incident["target_systems"]
    
    playbook = {
        "incident_id": incident["incident_id"],
        "title": f"Mitigation: {threat}",
        "immediate_actions": [],
        "investigation_steps": []
    }
    
    if "Exfiltration" in threat:
        playbook["immediate_actions"] = [
            f"Block outbound traffic from {src_ip} at the perimeter firewall",
            f"Isolate internal host {src_ip} from active network",
            "Disable active sessions for associated users"
        ]
        playbook["investigation_steps"] = [
            f"Capture remote memory dump from {src_ip}",
            "Audit file access logs for sensitive directories"
        ]
    elif "Movement" in threat:
        playbook["immediate_actions"] = [
            f"Isolate host {src_ip} from internal network",
            "Force password resets for accounts active on that host"
        ]
        playbook["investigation_steps"] = [
            "Check event logs for 4624 (Logon) and 4625 (Failed Logon)",
            "Identify what other hosts this machine communicated with"
        ]
    elif "Brute Force" in threat:
        playbook["immediate_actions"] = [
            f"Apply IP ban at firewall for the attacking source",
            "Lockout affected user accounts temporarily"
        ]
        playbook["investigation_steps"] = [
            "Verify if any login attempts succeeded (Event ID 4624)"
        ]
        
    return playbook
