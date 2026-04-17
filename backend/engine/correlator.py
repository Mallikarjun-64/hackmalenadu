import uuid

def correlate_alerts(alerts: list[dict]):
    # Cross-layer correlation logic
    incidents = []
    
    # Group alerts by source IP as the primary entity
    grouped = {}
    for alert in alerts:
        src = alert.get("src_ip")
        if src not in grouped:
            grouped[src] = []
        grouped[src].append(alert)
        
    for src_ip, src_alerts in grouped.items():
        if len(src_alerts) > 1:
            # Check if we span multiple layers
            layers = set(a["layer"] for a in src_alerts)
            if len(layers) > 1:
                # High confidence correlated incident
                primary_threat = src_alerts[0]["threat_type"] # Simplified pick
                
                # Boost confidence and severity
                incident = {
                    "incident_id": f"INC-2026-{uuid.uuid4().hex[:4].upper()}",
                    "threat_type": f"Correlated {primary_threat}",
                    "affected_layers": " + ".join(layers).title(),
                    "severity": "critical", # Boosted
                    "confidence": min(99, max(a["confidence"] for a in src_alerts) + 15),
                    "target_systems": src_ip,
                    "alerts": src_alerts
                }
                incidents.append(incident)
                
    return incidents
