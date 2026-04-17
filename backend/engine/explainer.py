def explain_incident(incident: dict) -> dict:
    threat = incident["threat_type"].replace("Correlated ", "")
    src_ip = incident["target_systems"]
    layers = incident["affected_layers"]
    
    if "Exfiltration" in threat:
        reason = f"Host {src_ip} transferred abnormally large amounts of data. This was detected at the {layers} layers, indicating a high-confidence data exfiltration event (MITRE T1041). The correlation confirms activity wasn't an isolated anomaly."
        fp_reason = "If the user is an administrator performing a bulk backup, this may be benign."
    elif "Movement" in threat:
        reason = f"Host {src_ip} exhibited internal lateral movement patterns across {layers} layers using tools like PsExec (MITRE T1021). This often follows initial credential compromise."
        fp_reason = "IT deployment scripts can sometimes mimic this behavior."
    else:
        reason = f"Suspicious activity targeting {src_ip} observed across {layers}. Correlated confidence is {incident['confidence']}%."
        fp_reason = "Check for scheduled maintenance."
        
    return {
        "incident_id": incident["incident_id"],
        "explanation": reason,
        "false_positive_context": fp_reason
    }
