import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, Target, BookOpen, Activity, Radio, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/live-monitoring', label: 'Live Monitoring', icon: Radio },
    { path: '/incidents', label: 'Incidents & Alerts', icon: ShieldAlert },
    { path: '/playbooks', label: 'Playbooks', icon: BookOpen },
    { path: '/simulation', label: 'Simulation', icon: Target },
    { path: '/analytics', label: 'Analytics', icon: Activity },
    { path: '/website-audit', label: 'Website Audit', icon: ShieldCheck },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <ShieldAlert className="logo-icon" size={28} />
        <span>HackMalenadu</span>
      </div>
      <nav className="nav-links">
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
