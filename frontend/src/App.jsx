import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Incidents from './pages/Incidents';
import Playbooks from './pages/Playbooks';
import Simulation from './pages/Simulation';
import Analytics from './pages/Analytics';
import LiveMonitoring from './pages/LiveMonitoring';
import WebsiteAudit from './pages/WebsiteAudit';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/playbooks" element={<Playbooks />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/live-monitoring" element={<LiveMonitoring />} />
          <Route path="/website-audit" element={<WebsiteAudit />} />
          {/* Fallback */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
