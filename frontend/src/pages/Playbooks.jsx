import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { WS_BASE } from '../services/api';

const Playbooks = () => {
  const [incidents, setIncidents] = useState([]);
  const [activePlaybook, setActivePlaybook] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/updates`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.incidents && data.incidents.length > 0) {
        setIncidents(data.incidents);
        if (!activePlaybook) setActivePlaybook(data.incidents[0]);
      }
    };
    return () => ws.close();
  }, [activePlaybook]);

  return (
    <>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>Response Playbooks</h1>
        <p className="text-muted text-sm">Dynamically generated mitigation strategies for active incidents.</p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="glass-panel flex-col flex" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="glass-header">Available Playbooks</div>
          <div className="glass-body flex-col flex gap-2" style={{ overflowY: 'auto' }}>
            {incidents.length === 0 ? (
              <div className="text-muted text-sm text-center mt-8">No active playbooks. Run a simulation to generate some.</div>
            ) : incidents.map(inc => (
              <div 
                key={inc.incident_id}
                onClick={() => setActivePlaybook(inc)}
                style={{ 
                  padding: '12px', 
                  background: activePlaybook?.incident_id === inc.incident_id ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)', 
                  border: activePlaybook?.incident_id === inc.incident_id ? '1px solid var(--accent-primary)' : '1px solid transparent', 
                  borderRadius: '8px', 
                  cursor: 'pointer' 
                }}
              >
                <div style={{ fontWeight: 600 }}>{inc.playbook.title}</div>
                <div className="text-xs text-muted mt-1">For {inc.incident_id}</div>
              </div>
            ))}
          </div>
        </div>

        {activePlaybook ? (
        <div className="glass-panel flex-col flex" style={{ maxHeight: 'calc(100vh - 180px)' }}>
          <div className="glass-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{activePlaybook.playbook.title}</span>
            <button style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: 'var(--accent-primary)', color: 'white', 
              border: 'none', padding: '6px 12px', borderRadius: '6px', 
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' 
            }}>
              <Play size={14} /> Execute Auto-Mitigation
            </button>
          </div>
          <div className="glass-body font-mono text-sm" style={{ overflowY: 'auto', background: 'rgba(0,0,0,0.3)', borderRadius: '0 0 12px 12px' }}>
            <div style={{ borderLeft: '2px solid var(--severity-critical)', paddingLeft: '16px', marginBottom: '24px' }}>
              <h3 style={{ color: 'white', marginBottom: '8px' }}>IMMEDIATE CONTAINMENT</h3>
              {activePlaybook.playbook.immediate_actions.map((act, i) => (
                <div key={`imm-${i}`} className="flex items-center gap-2" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" /> {i+1}. {act}
                </div>
              ))}
            </div>

            <div style={{ borderLeft: '2px solid var(--severity-high)', paddingLeft: '16px' }}>
              <h3 style={{ color: 'white', marginBottom: '8px' }}>INVESTIGATION STEPS</h3>
              {activePlaybook.playbook.investigation_steps.map((act, i) => (
                <div key={`inv-${i}`} className="flex items-center gap-2" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" /> {activePlaybook.playbook.immediate_actions.length + i + 1}. {act}
                </div>
              ))}
            </div>
          </div>
        </div>
        ) : (
          <div className="glass-panel flex items-center justify-center text-muted">
            Select a playbook to view details.
          </div>
        )}
      </div>
    </>
  );
};

export default Playbooks;
