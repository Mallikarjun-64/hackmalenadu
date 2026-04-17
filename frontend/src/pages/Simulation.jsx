import React, { useState } from 'react';
import { Target, Activity, CheckCircle, PlaySquare } from 'lucide-react';
import { startSimulation } from '../services/api';

const Simulation = () => {
  const [activeScenario, setActiveScenario] = useState(null);
  
  const scenarios = [
    { id: 'exfiltration', name: 'Data Exfiltration', desc: 'Simulates huge outbound data transfer to an external IP.', type: 'Network + Application' },
    { id: 'lateral_movement', name: 'Lateral Movement', desc: 'Simulates internal PsExec process start followed by internal RDP scanning.', type: 'Network + Endpoint' },
    { id: 'c2_beacon', name: 'C2 Beaconing', desc: 'Periodic HTTPS check-ins with exact standard deviation to external IP.', type: 'Network' }
  ];

  const handleStart = async (scenarioId) => {
    try {
      await startSimulation(scenarioId);
      setActiveScenario(scenarioId);
      setTimeout(() => setActiveScenario(null), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>Attack Simulation</h1>
        <p className="text-muted text-sm">Inject malicious behavior into the real-time pipeline to validate the detection engine.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {scenarios.map(s => (
          <div key={s.id} className="glass-panel glass-body flex-col flex justify-between gap-4" style={{ position: 'relative', overflow: 'hidden' }}>
            {activeScenario === s.id && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '4px', background: 'var(--severity-critical)', color: 'white', textAlign: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                SIMULATION RUNNING
              </div>
            )}
            
            <div style={{ marginTop: activeScenario === s.id ? '20px' : '0' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target size={18} className="text-muted" />
                <h3 style={{ fontWeight: 600 }}>{s.name}</h3>
              </div>
              <p className="text-sm text-muted mb-4">{s.desc}</p>
              <span className="badge badge-low">{s.type}</span>
            </div>
            
            <button 
              onClick={() => handleStart(s.id)}
              disabled={activeScenario !== null}
              style={{
                width: '100%',
                padding: '10px',
                background: activeScenario === s.id ? 'var(--panel-border)' : 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: activeScenario !== null ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                transition: '0.2s all'
              }}
            >
              {activeScenario === s.id ? <Activity size={18} className="lucide-spin" /> : <PlaySquare size={18} />}
              {activeScenario === s.id ? 'Running...' : 'Start Scenario'}
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default Simulation;
