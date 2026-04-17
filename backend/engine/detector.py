import uuid
from sklearn.ensemble import IsolationForest
import pandas as pd
from .ingestion import UnifiedEvent

# Pre-initialized Isolation Forest model
iso_forest = IsolationForest(contamination=0.05, random_state=42)
is_trained = False

def detect_threats(events: list[UnifiedEvent]):
    from .feature_extractor import extract_features
    global is_trained, iso_forest
    
    alerts = []
    if not events:
        return alerts

    features_df = extract_features(events)
    
    # Train the base ML model on the first large batch of traffic (hackathon shortcut to avoid model persistence)
    if not is_trained and len(features_df) > 10:
        X = features_df[['event_count', 'unique_destinations', 'total_bytes', 'avg_duration']].fillna(0)
        iso_forest.fit(X)
        is_trained = True

    anomalous_ips = set()
    if is_trained and not features_df.empty:
        X = features_df[['event_count', 'unique_destinations', 'total_bytes', 'avg_duration']].fillna(0)
        preds = iso_forest.predict(X)
        features_df['anomaly'] = preds
        anomalies = features_df[features_df['anomaly'] == -1]
        anomalous_ips = set(anomalies['source_ip'])

    # Simple aggregations for rule evaluation
    src_stats = {}
    for ev in events:
        if ev.source_ip not in src_stats:
            src_stats[ev.source_ip] = {"failed_logins": 0, "bytes_out": 0, "unique_dst": set(), "events": []}
        
        src_stats[ev.source_ip]["events"].append(ev)
        src_stats[ev.source_ip]["bytes_out"] += ev.bytes_total
        if ev.destination_ip:
            src_stats[ev.source_ip]["unique_dst"].add(ev.destination_ip)
            
        if ev.layer == "application":
            msg = str(ev.metadata.get("message", "")).lower()
            # Count status 401 OR console messages suggesting login failure
            if ev.metadata.get("status_code") == 401 or "failed login" in msg or "invalid credentials" in msg or "401" in msg:
                src_stats[ev.source_ip]["failed_logins"] += 1

    # Rules evaluation
    for src_ip, stats in src_stats.items():
        ml_confidence_boost = 15 if src_ip in anomalous_ips else 0
        
        # Rule 1: Brute Force (Includes Simulator and Real Website Console)
        if stats["failed_logins"] >= 10:
            alerts.append({
                "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "threat_type": "Brute Force / credential Access",
                "layer": "application",
                "src_ip": src_ip,
                "severity": "high",
                "confidence": min(100, 80 + ml_confidence_boost),
                "events": [e.event_id for e in stats["events"] if "401" in str(e.metadata.get("message", "")) or e.metadata.get("status_code") == 401],
                "mitre_id": "T1110"
            })
        
        # Rule 2: Data Exfiltration (Network)
        if stats["bytes_out"] > 10000000: # 10MB threshold
            alerts.append({
                "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "threat_type": "Data Exfiltration (Network)",
                "layer": "network",
                "src_ip": src_ip,
                "severity": "critical",
                "confidence": min(100, 85 + ml_confidence_boost),
                "events": [e.event_id for e in stats["events"] if e.bytes_total > 5000000],
                "mitre_id": "T1041"
            })
            
        # Rule 3: Endpoint suspicious processes
        for ev in stats["events"]:
            if ev.layer == "endpoint":
                proc = ev.metadata.get("process_name")
                if proc == "psexec.exe":
                    alerts.append({
                        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "threat_type": "Lateral Movement (Endpoint)",
                        "layer": "endpoint",
                        "src_ip": src_ip,
                        "severity": "high",
                        "confidence": min(100, 70 + ml_confidence_boost),
                        "events": [ev.event_id],
                        "mitre_id": "T1021"
                    })
                elif proc == "tar.exe":
                    alerts.append({
                        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "threat_type": "Data Archiving / Exfiltration (Endpoint)",
                        "layer": "endpoint",
                        "src_ip": src_ip,
                        "severity": "high",
                        "confidence": min(100, 60 + ml_confidence_boost),
                        "events": [ev.event_id],
                        "mitre_id": "T1560"
                    })

        # Rule 4: Network Lateral Movement Scan
        rdp_smb_events = [e for e in stats["events"] if e.layer == "network" and e.metadata.get("dst_port") in [3389, 445]]
        if len(rdp_smb_events) >= 1:
            alerts.append({
                "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "threat_type": "Internal Port Scan (Network)",
                "layer": "network",
                "src_ip": src_ip,
                "severity": "medium",
                "confidence": min(100, 50 + ml_confidence_boost),
                "events": [e.event_id for e in rdp_smb_events],
                "mitre_id": "T1046"
            })
        # Rule 5: Real-World OS Process Auditing
        for ev in stats["events"]:
            if ev.layer == "endpoint":
                proc = ev.metadata.get("process_name")
                if proc and proc.lower() in ["powershell.exe", "cmd.exe", "wscript.exe", "cscript.exe"]:
                    alerts.append({
                        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "threat_type": "Suspicious Shell Invocation (Real Host)",
                        "layer": "endpoint",
                        "src_ip": src_ip,
                        "severity": "medium",
                        "confidence": min(100, 45 + ml_confidence_boost),
                        "events": [ev.event_id],
                        "mitre_id": "T1059"
                    })

        # Rule 6: Real-World Network Clustering (Possible C2 or Scan)
        if len(stats["unique_dst"]) > 15:
            alerts.append({
                "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                "threat_type": "High Connection Volume (Real Host)",
                "layer": "network",
                "src_ip": src_ip,
                "severity": "high",
                "confidence": min(100, 60 + ml_confidence_boost),
                "events": [e.event_id for e in stats["events"] if e.layer == "network"][:5],
                "mitre_id": "T1046"
            })
            
        # Rule 7: Real-World Website Security Audit (XSS/CSP/Leaks)
        for ev in stats["events"]:
            if ev.layer == "application" and ev.metadata.get("client_type") == "browser_agent":
                msg = str(ev.metadata.get("message", "")).lower()
                
                # Check for XSS or CSP violations
                if any(k in msg for k in ["xss", "csp violation", "refused to execute script", "content security policy"]):
                    alerts.append({
                        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "threat_type": "Web Injection / CSP Violation",
                        "layer": "application",
                        "src_ip": src_ip,
                        "severity": "high",
                        "confidence": 90,
                        "events": [ev.event_id],
                        "mitre_id": "T1059.007"
                    })
                
                # Check for sensitive data leaks in logs
                if any(k in msg for k in ["apikey", "api_key", "password=", "secret="]):
                    alerts.append({
                        "alert_id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "threat_type": "Sensitive Information Leak (Console)",
                        "layer": "application",
                        "src_ip": src_ip,
                        "severity": "medium",
                        "confidence": 85,
                        "events": [ev.event_id],
                        "mitre_id": "T1592"
                    })

    return alerts
