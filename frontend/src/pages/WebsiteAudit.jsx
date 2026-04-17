import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Globe, Crosshair, AlertOctagon, Terminal, Info, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { WS_BASE } from '../services/api';

const WebsiteAudit = () => {
  const [logs, setLogs] = useState([]);
  const [analysis, setAnalysis] = useState({
    activeSite: 'No active session',
    healthScore: 100,
    bruteForceProb: 0,
    findings: [],
    status: 'SECURE'
  });

  useEffect(() => {
    let ws;
    const connect = () => {
      ws = new WebSocket(`${WS_BASE}/ws/updates`);

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'init' || data.type === 'update') {
          const raw = data.raw_events || [];
          // More robust filter for browser logs
          const clientLogs = raw.filter(l => (l.layer === 'application' && l.process === 'browser_agent') || (l.layer === 'application' && l.alert_id));
          
          if (clientLogs.length > 0) {
            const latest = clientLogs[clientLogs.length - 1];
            try {
               const site = latest.url ? new URL(latest.url).hostname : analysis.activeSite;
               setLogs(prev => [...clientLogs, ...prev].slice(0, 50));
               
               // Calculate Metrics
               const securityAlerts = data.alerts?.filter(a => (a.layer === 'application' && a.mitre_id?.startsWith('T1059')) || a.mitre_id === 'T1592') || [];
               const bruteForceAlerts = data.alerts?.filter(a => a.threat_type.includes('Brute Force')) || [];
               
               const bfProb = Math.min(100, bruteForceAlerts.length * 20);
               const health = Math.max(0, 100 - (securityAlerts.length * 15) - (bfProb / 2));
               
               let status = 'SECURE';
               if (health < 40) status = 'CRITICAL';
               else if (health < 80) status = 'WARNING';

               setAnalysis(prev => ({
                 activeSite: site,
                 healthScore: health,
                 bruteForceProb: bfProb,
                 findings: securityAlerts.slice(0, 5),
                 status: status
               }));
            } catch(e) { console.error(e); }
          }
        }
      };

      ws.onclose = () => setTimeout(connect, 3000); // Reconnect every 3s
    };

    connect();
    return () => ws?.close();
  }, []);

  const gaugeData = [
    { name: 'Threat', value: analysis.bruteForceProb },
    { name: 'Safe', value: 100 - analysis.bruteForceProb }
  ];

  const COLORS = ['var(--severity-high)', 'rgba(255,255,255,0.05)'];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>Website Security Audit</h1>
          <p className="text-muted text-sm">Real-time analysis of client-side vulnerabilities and attack attempts.</p>
        </div>
        <div className={`badge ${analysis.status === 'SECURE' ? 'badge-low' : analysis.status === 'WARNING' ? 'badge-medium' : 'badge-high'}`}>
           {analysis.status === 'SECURE' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
           STATUS: {analysis.status}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Active Site Infocard */}
        <div className="glass-panel glass-body flex items-center gap-4">
          <div className="stat-icon" style={{ background: 'var(--accent-glow)' }}>
            <Globe className="text-primary" size={24} />
          </div>
          <div>
            <div className="text-sm text-muted">Currently Auditing</div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{analysis.activeSite}</div>
          </div>
        </div>

        {/* Health Score */}
        <div className="glass-panel glass-body flex items-center gap-4">
          <div className="stat-icon" style={{ background: analysis.healthScore > 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
            <Activity className={analysis.healthScore > 70 ? 'text-success' : 'text-danger'} size={24} />
          </div>
          <div>
            <div className="text-sm text-muted">Security Health</div>
            <div className="stat-value">{Math.round(analysis.healthScore)}%</div>
          </div>
        </div>

        {/* Brute Force Probability */}
        <div className="glass-panel glass-body flex items-center gap-4">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <Crosshair style={{ color: 'var(--severity-medium)' }} size={24} />
          </div>
          <div>
            <div className="text-sm text-muted">Web Brute-Force Prob.</div>
            <div className="stat-value">{analysis.bruteForceProb}%</div>
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Visualization column */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel flex-col flex">
            <div className="glass-header">Attack Probability</div>
            <div className="glass-body" style={{ height: '220px', minHeight: '220px', position: 'relative' }}>
               <ResponsiveContainer width="99%" height="99%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="80%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      {gaugeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
               </ResponsiveContainer>
               <div style={{ position: 'absolute', bottom: '25%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{analysis.bruteForceProb}%</div>
                  <div className="text-xs text-muted">Activity Density</div>
               </div>
            </div>
          </div>

          <div className="glass-panel flex-col flex" style={{ flex: 1 }}>
            <div className="glass-header">Security Findings</div>
            <div className="glass-body">
              {analysis.findings.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 opacity-40">
                  <ShieldCheck size={40} className="mb-2" />
                  <div className="text-sm">No critical vulnerabilities found</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {analysis.findings.map((f, i) => (
                    <div key={i} className="glass-panel p-3 border-l-4" style={{ borderColor: 'var(--severity-high)', background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertOctagon size={14} style={{ color: 'var(--severity-high)' }} />
                        <span className="text-xs font-bold">{f.threat_type}</span>
                      </div>
                      <div className="text-xs text-muted line-clamp-2">Alert ID: {f.alert_id} | MITRE: {f.mitre_id}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Intel Wall */}
        <div className="glass-panel flex-col flex">
          <div className="glass-header flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Terminal size={18} /> Analyzed Client Intelligence
             </div>
             <div className="text-xs font-normal text-muted">Filtered: Security & Errors only</div>
          </div>
          <div className="glass-body p-0 overflow-hidden flex-1" style={{ position: 'relative' }}>
             <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflowY: 'auto', padding: '16px' }}>
                {logs.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 glass-panel border-dashed opacity-50">
                    <Info size={20} />
                    <div className="text-sm">Waiting for client agent to push encrypted telemetry...</div>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-muted border-b border-white border-opacity-5">
                        <th className="pb-2 font-medium">Timestamp</th>
                        <th className="pb-2 font-medium">Site Source</th>
                        <th className="pb-2 font-medium">Analyzer Output</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, i) => (
                        <tr key={i} className="border-b border-white border-opacity-5 last:border-0">
                          <td className="py-3 text-muted" style={{ width: '120px' }}>{log.timestamp.split('T')[1].split('.')[0]}</td>
                          <td className="py-3" style={{ width: '150px' }}>
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${log.is_malicious ? 'bg-danger pulse' : 'bg-success'}`}></div>
                                <span className="truncate max-w-[120px]">{log.url ? new URL(log.url).hostname : 'unknown'}</span>
                             </div>
                          </td>
                          <td className="py-3 text-primary font-mono" style={{ color: log.is_malicious ? 'var(--severity-high)' : 'var(--text-primary)' }}>
                             {log.alert_id ? `[BLOCK] Detected ${log.action}` : log.status === 401 ? '[WARN] Recurring Auth Failure' : log.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WebsiteAudit;
