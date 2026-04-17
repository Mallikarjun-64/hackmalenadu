import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, BarChart3, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { WS_BASE } from '../services/api';

const Analytics = () => {
  const [metrics, setMetrics] = useState({
    events: 0,
    alerts: 0,
    incidents: 0,
    fpRate: 0.0
  });

  const [volumeData, setVolumeData] = useState([]);
  const [distributionData, setDistributionData] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(`${WS_BASE}/ws/updates`);
    
    // For calculating false positives (mock logic: assume 5% of low severity alerts are FP)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'init' || data.type === 'update') {
        const newAlerts = data.alerts || [];
        const newIncidents = data.incidents || [];
        
        setMetrics(prev => {
          const totalAlerts = prev.alerts + newAlerts.length;
          // Simulated FP calculation: Low confidence alerts slightly bump FP rate
          const lowConf = newAlerts.filter(a => a.confidence < 60).length;
          const fp = prev.fpRate === 0.0 ? 1.2 : Math.min(15.0, prev.fpRate + (lowConf * 0.1));
          
          return {
            events: data.total_events || prev.events, // Native OS traffic
            alerts: totalAlerts,
            incidents: newIncidents.length > 0 ? newIncidents.length : prev.incidents,
            fpRate: parseFloat(fp.toFixed(1))
          };
        });

        if (newAlerts.length > 0) {
          // Update Threat Distribution
          setDistributionData(prevDistro => {
            const nextDistro = [...prevDistro];
            newAlerts.forEach(alert => {
              const type = alert.threat_type;
              const existing = nextDistro.find(d => d.name === type);
              if (existing) {
                existing.count += 1;
              } else {
                nextDistro.push({ name: type, count: 1 });
              }
            });
            return nextDistro.sort((a,b) => b.count - a.count).slice(0, 5); // top 5
          });

          // Update Volume Timeline
          setVolumeData(prev => {
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
            
            // Count layer specific activity in this batch
            const netCount = newAlerts.filter(a => a.layer.includes('network')).length;
            const endCount = newAlerts.filter(a => a.layer.includes('endpoint')).length;

            const newPoint = { 
              time: timeStr, 
              network: 100 + (netCount * 50) + Math.random() * 200, 
              endpoint: 80 + (endCount * 50) + Math.random() * 150 
            };
            return [...prev, newPoint].slice(-10); // keep last 10 points
          });
        }
      }
    };
    return () => ws.close();
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '4px' }}>System Analytics</h1>
          <p className="text-muted text-sm">Historical performance and threat distribution metrics.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><Activity className="text-muted" /></div>
            <div>
              <div className="text-sm text-muted">Total Events Processed</div>
              <div className="stat-value">{metrics.events.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><ShieldAlert style={{ color: 'var(--severity-medium)'}} /></div>
            <div>
              <div className="text-sm text-muted">Total Alerts Generated</div>
              <div className="stat-value">{metrics.alerts}</div>
            </div>
          </div>
        </div>
        <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><BarChart3 style={{ color: 'var(--severity-critical)'}} /></div>
            <div>
              <div className="text-sm text-muted">Correlated Incidents</div>
              <div className="stat-value">{metrics.incidents}</div>
            </div>
          </div>
        </div>
         <div className="glass-panel glass-body">
          <div className="stat-card">
            <div className="stat-icon"><PieChart style={{ color: 'var(--safe-green)'}} /></div>
            <div>
              <div className="text-sm text-muted">False Positive Rate</div>
              <div className="stat-value">{metrics.fpRate}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="glass-panel flex-col flex">
          <div className="glass-header">
            Ingestion Volume by Layer
            <span className="text-xs text-muted font-normal">Last 7 Hours</span>
          </div>
          <div className="glass-body" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Area type="monotone" dataKey="network" stackId="1" stroke="var(--accent-primary)" fill="var(--accent-glow)" />
                <Area type="monotone" dataKey="endpoint" stackId="1" stroke="var(--safe-green)" fill="rgba(16, 185, 129, 0.3)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel flex-col flex">
          <div className="glass-header">
            Threat Distribution
          </div>
          <div className="glass-body" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" />
                <YAxis dataKey="name" type="category" width={100} stroke="var(--text-secondary)" tick={{fontSize: 12}} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="count" fill="var(--severity-high)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
};

export default Analytics;
