import React, { useState, useEffect } from 'react';
import { ShieldCheck, Target, Activity, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { WS_BASE } from '../services/api';const Dashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState({ events: 0, critical: 0 });
  const [chartData, setChartData] = useState([]);
  
  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/updates`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init' || data.type === 'update') {
        
        // Always update metrics now that we have real OS telemetry
        setMetrics(prev => ({
          events: data.total_events || prev.events,
          critical: data.incidents?.filter(i => i.severity === 'critical').length || prev.critical
        }));

        // Always update the timeline chart
        const now = new Date();
        setChartData(prev => {
          const newPoint = { 
            time: `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`, 
            events: data.batch_size || (Math.random() * 50), 
            anomalies: data.alerts ? data.alerts.length : 0
          };
          return [...prev, newPoint].slice(-10);
        });

        // Only update alerts UI if we got fresh ones
        if (data.alerts && data.alerts.length > 0) {
          setAlerts(prev => [...data.alerts, ...prev].slice(0, 10));
        }
      }
    };
    
    return () => ws.close();
  }, []);
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>Security Dashboard</h1>
          <p className="text-muted text-sm">Real-time threat detection and analysis overview.</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--safe-green)' }}></div>
            Engine Active
          </span>
          <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--safe-green)' }}></div>
            Correlator Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><Activity className="text-muted" /></div>
            <div>
              <div className="text-sm text-muted">Events Processed (24h)</div>
              <div className="stat-value">{metrics.events.toLocaleString()} <span className="stat-trend up" style={{ color: 'var(--safe-green)'}}>Live</span></div>
            </div>
          </div>
        </div>
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><AlertTriangle style={{ color: 'var(--severity-high)'}} /></div>
            <div>
              <div className="text-sm text-muted">Active Alerts</div>
              <div className="stat-value">{alerts.length}</div>
            </div>
          </div>
        </div>
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><Target style={{ color: 'var(--severity-critical)'}} /></div>
            <div>
              <div className="text-sm text-muted">Critical Incidents</div>
              <div className="stat-value">{metrics.critical}</div>
            </div>
          </div>
        </div>
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><ShieldCheck style={{ color: 'var(--safe-green)'}} /></div>
            <div>
              <div className="text-sm text-muted">Auto-Mitigations</div>
              <div className="stat-value">18 <span className="stat-trend up">+24%</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
        <div className="glass-panel flex-col flex">
          <div className="glass-header">
            Event & Anomaly Timeline
            <span className="text-xs text-muted font-normal">Last 30 Minutes</span>
          </div>
          <div className="glass-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#131729', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Line type="monotone" dataKey="events" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="anomalies" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel flex-col flex">
          <div className="glass-header">Threat Radar Map</div>
          <div className="glass-body" style={{ height: '300px', padding: '0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                { subject: 'Exfiltration', A: alerts.filter(a => a.threat_type.includes('Exfil')).length * 20 + 20, fullMark: 150 },
                { subject: 'Lateral Mvmt', A: alerts.filter(a => a.threat_type.includes('Lateral')).length * 30 + 10, fullMark: 150 },
                { subject: 'Brute Force', A: alerts.filter(a => a.threat_type.includes('Brute')).length * 15 + 40, fullMark: 150 },
                { subject: 'Beaconing', A: alerts.filter(a => a.threat_type.includes('C2')).length * 50 + 10, fullMark: 150 },
                { subject: 'Malware', A: 10, fullMark: 150 }
              ]}>
                <PolarGrid stroke="var(--panel-border)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                <Radar name="Threat Activity" dataKey="A" stroke="var(--severity-high)" fill="var(--severity-high)" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel flex-col flex">
          <div className="glass-header">
            Recent Alerts
            <span className="text-xs text-muted font-normal" style={{ display: 'flex', alignItems:'center', gap:'4px', cursor: 'pointer' }}>
              View All <ArrowUpRight size={14} />
            </span>
          </div>
          <div className="glass-body flex-col flex gap-2" style={{ overflowY: 'auto' }}>
            {alerts.slice(0, 10).map(alert => (
              <div key={alert.alert_id} style={{ 
                padding: '12px', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '8px',
                borderLeft: `3px solid var(--severity-${alert.severity})`
              }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
                  <span className="font-mono text-xs text-muted">{alert.alert_id}</span>
                  <span className="text-xs text-muted">Live</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{alert.threat_type}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge badge-${alert.severity}`}>{alert.severity}</span>
                  <span className="text-xs text-muted">Confidence: {alert.confidence}%</span>
                  <span className="text-xs text-muted" style={{ marginLeft: 'auto' }}>{alert.src_ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
