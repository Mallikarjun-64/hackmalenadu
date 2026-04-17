import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Shield, Cpu, Globe, AlertTriangle, ChevronRight } from 'lucide-react';
import { WS_BASE } from '../services/api';

const LAYER_META = {
  network: { label: 'NETWORK_CONNECT', color: '#3b82f6', icon: Globe },
  endpoint: { label: 'PROCESS_START', color: '#10b981', icon: Cpu },
  application: { label: 'HTTP_REQUEST', color: '#8b5cf6', icon: Globe },
};

const LiveMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all | network | endpoint | suspicious
  const [paused, setPaused] = useState(false);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/updates`);

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const incoming = data.raw_events || [];

      if (data.type === 'init') {
        // Always load full history on connect/refresh regardless of pause state
        if (incoming.length > 0) {
          setLogs(incoming);
        }
        return;
      }

      // For live updates, respect pause
      if (paused) return;
      if (incoming.length === 0) return;

      setLogs(prev => [...prev, ...incoming].slice(-500));
    };

    return () => ws.close();
  }, [paused]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  const handleSuspiciousClick = (log) => {
    // Pass alert context via sessionStorage and navigate to dashboard
    sessionStorage.setItem('highlighted_alert', JSON.stringify({
      src_ip: log.src_ip,
      alert_id: log.alert_id,
      attack_type: log.attack_type,
      layer: log.layer
    }));
    navigate('/');
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'suspicious') return log.is_malicious || log.attack_type;
    if (filter === 'network') return log.layer === 'network';
    if (filter === 'endpoint') return log.layer === 'endpoint';
    return true;
  });

  const isSuspicious = (log) => log.is_malicious || log.attack_type;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Radio size={22} style={{ color: 'var(--severity-critical)', animation: 'pulse 2s infinite' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Live Monitoring</h1>
            <span style={{
              fontSize: '10px', fontWeight: 700, padding: '2px 8px',
              borderRadius: '99px', background: 'var(--severity-critical)',
              color: 'white', letterSpacing: '1px'
            }}>● LIVE</span>
          </div>
          <p className="text-muted text-sm">Global Telemetry Stream — Real-time correlation across Network and Endpoint layers.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setPaused(p => !p)}
            style={{
              padding: '6px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: paused ? 'var(--severity-high)' : 'transparent',
              color: paused ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600
            }}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: '6px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: 'transparent', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '13px'
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'All Events' },
          { key: 'network', label: '🌐 Network' },
          { key: 'endpoint', label: '💻 Endpoint' },
          { key: 'suspicious', label: '⚠️ Suspicious Only' }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '5px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
            border: '1px solid var(--panel-border)',
            background: filter === f.key ? 'var(--accent-primary)' : 'transparent',
            color: filter === f.key ? 'white' : 'var(--text-secondary)',
            fontWeight: filter === f.key ? 600 : 400
          }}>
            {f.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
          {filteredLogs.length} events
        </span>
      </div>

      {/* Telemetry Stream Panel */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '70vh' }}>
        <div className="glass-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} />
            Global Telemetry Stream
          </div>
          <span className="text-xs text-muted">Click a suspicious row to analyze on Dashboard</span>
        </div>
        <div className="glass-body" style={{
          flex: 1, overflowY: 'auto', fontFamily: 'monospace',
          fontSize: '12px', lineHeight: '1.6', display: 'flex', flexDirection: 'column',
          gap: '0', padding: '0', maxHeight: '68vh'
        }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Radio size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <div>Waiting for telemetry...</div>
              <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.6 }}>Events will appear here once the engine processes host traffic</div>
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const suspicious = isSuspicious(log);
              const meta = LAYER_META[log.layer] || LAYER_META.network;
              const ts = log.timestamp ? log.timestamp.replace('T', ' ').split('.')[0] + '.' + (log.timestamp.split('.')[1] || '000000').slice(0, 6) : '';

              return (
                <div
                  key={log.event_id + i}
                  onClick={suspicious ? () => handleSuspiciousClick(log) : undefined}
                  style={{
                    padding: '10px 20px',
                    borderLeft: `3px solid ${suspicious ? 'var(--severity-critical)' : meta.color}`,
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    backgroundColor: suspicious ? 'rgba(239,68,68,0.06)' : 'transparent',
                    cursor: suspicious ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                    display: 'flex', flexDirection: 'column', gap: '2px'
                  }}
                  onMouseEnter={e => {
                    if (suspicious) e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)';
                  }}
                  onMouseLeave={e => {
                    if (suspicious) e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.06)';
                  }}
                >
                  {/* Row 1: Timestamp + event type */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>{ts}</span>
                    <span style={{
                      color: meta.color, fontWeight: 700, fontSize: '11px',
                      letterSpacing: '0.5px'
                    }}>{meta.label}</span>
                    {suspicious && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '1px 6px',
                        borderRadius: '4px', background: 'var(--severity-critical)',
                        color: 'white', display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <AlertTriangle size={9} /> SUSPICIOUS
                      </span>
                    )}
                    {suspicious && (
                      <span style={{
                        marginLeft: 'auto', fontSize: '10px', color: 'var(--severity-critical)',
                        display: 'flex', alignItems: 'center', gap: '2px'
                      }}>
                        Analyze <ChevronRight size={12} />
                      </span>
                    )}
                  </div>
                  {/* Row 2: IPs / process info */}
                  <div style={{ color: 'var(--text-primary)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {log.src_ip && <span><span style={{ color: '#64748b' }}>src:</span> <span style={{ color: '#e2e8f0' }}>{log.src_ip}</span></span>}
                    {log.dst_ip && <span><span style={{ color: '#64748b' }}>→</span> <span style={{ color: meta.color }}>{log.dst_ip}</span></span>}
                    {log.process && <span><span style={{ color: '#64748b' }}>proc:</span> <span style={{ color: suspicious ? '#fca5a5' : '#e2e8f0' }}>{log.process}</span></span>}
                    {log.bytes > 0 && <span><span style={{ color: '#64748b' }}>bytes:</span> {log.bytes.toLocaleString()}</span>}
                    {log.status && <span><span style={{ color: '#64748b' }}>status:</span> {log.status}</span>}
                    {log.attack_type && <span style={{ color: 'var(--severity-critical)' }}>attack: {log.attack_type}</span>}
                  </div>
                  {/* Row 3: Sensor label */}
                  <div style={{ color: '#64748b', fontSize: '10px' }}>
                    Sensor: {log.layer === 'network' ? 'psutil_net' : log.layer === 'endpoint' ? 'psutil_proc' : 'app_layer'} &nbsp;|&nbsp; Status: {log.is_malicious ? 'flagged' : 'success'}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </>
  );
};

export default LiveMonitoring;
