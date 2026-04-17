import pandas as pd
import numpy as np

def extract_features(events):
    if not events:
        return pd.DataFrame()
        
    # Convert active events into a DataFrame
    # Avoid pydantic deprecation warnings on model_dump dynamically
    event_dicts = []
    for e in events:
        d = {
            'event_id': e.event_id,
            'source_ip': e.source_ip,
            'bytes_total': e.bytes_total,
            'duration': e.duration,
            'destination_ip': e.destination_ip
        }
        event_dicts.append(d)
        
    df = pd.DataFrame(event_dicts)
    if df.empty or 'source_ip' not in df.columns:
        return pd.DataFrame()
        
    features = []
    grouped = df.groupby('source_ip')
    
    for src_ip, group in grouped:
        feat = {
            'source_ip': src_ip,
            'event_count': len(group),
            'unique_destinations': group['destination_ip'].nunique() if 'destination_ip' in group.columns else 0,
            'total_bytes': group['bytes_total'].sum() if 'bytes_total' in group.columns else 0,
            'avg_duration': group['duration'].mean() if 'duration' in group.columns else 0
        }
        features.append(feat)
        
    return pd.DataFrame(features)
