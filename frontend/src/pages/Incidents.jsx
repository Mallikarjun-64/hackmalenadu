import React, { useState, useEffect } from 'react';
import { WS_BASE } from '../services/api';

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/updates`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.incidents) {
        setIncidents(data.incidents);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>Incidents & Correlation</h1>
        <p className="text-muted text-sm">Analyze correlated multi-layer attack chains.</p>
      </div>

      <div className="glass-panel">
        <div className="glass-header">Active Incident Chains</div>
        <div style={{ padding: '0' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Threat Type</th>
                <th>Affected Layers</th>
                <th>Severity</th>
                <th>Target Systems</th>
                <th>Explainability</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted" style={{ padding: '24px' }}>No active incidents detected.</td></tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc.incident_id}>
                    <td className="font-mono">{inc.incident_id}</td>
                    <td style={{ fontWeight: 500 }}>{inc.threat_type}</td>
                    <td><span className="badge badge-low">{inc.affected_layers}</span></td>
                    <td><span className={`badge badge-${inc.severity}`}>{inc.severity}</span></td>
                    <td className="font-mono text-sm">{inc.target_systems}</td>
                    <td className="text-xs text-muted" style={{ maxWidth: '300px' }}>{inc.explanation.explanation}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '16px' }}>
        <div className="glass-header">MITRE ATT&CK Heat Map</div>
        <div className="glass-body p-4">
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { id: 'T1110', name: 'Brute Force', count: incidents.filter(i => i.threat_type.includes('Brute Force')).length },
              { id: 'T1041', name: 'Exfiltration Over C2', count: incidents.filter(i => i.threat_type.includes('Exfiltration')).length },
              { id: 'T1021', name: 'Remote Services', count: incidents.filter(i => i.threat_type.includes('Lateral Movement')).length },
              { id: 'T1071.001', name: 'Web Protocols', count: incidents.filter(i => i.threat_type.includes('Beaconing')).length },
              { id: 'T1059', name: 'Command & Script', count: 0 }
            ].map(t => (
              <div key={t.id} style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                textAlign: 'center',
                background: t.count > 0 ? 'var(--severity-critical)' : 'rgba(255,255,255,0.05)',
                color: t.count > 0 ? 'white' : 'var(--text-secondary)',
                opacity: t.count > 0 ? 1 : 0.5,
                border: t.count > 0 ? 'none' : '1px solid var(--panel-border)'
              }}>
                <div className="font-mono text-xs mb-1">{t.id}</div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs mt-2">{t.count} Detects</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Incidents;
