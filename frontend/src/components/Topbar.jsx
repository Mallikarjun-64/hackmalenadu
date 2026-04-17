import React, { useState, useEffect } from 'react';
import { Search, Bell, Settings, User, Moon, Sun } from 'lucide-react';

const Topbar = () => {
  const [isLight, setIsLight] = useState(true);

  useEffect(() => {
    if (isLight) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isLight]);

  const toggleTheme = () => {
    setIsLight(!isLight);
  };

  return (
    <header className="topbar">
      <div className="flex items-center gap-4" style={{ flex: 1 }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '8px', minWidth: '300px' }}>
          <Search size={18} className="text-muted" />
          <input 
            type="text" 
            placeholder="Search events, IPs, or alert IDs..." 
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', width: '100%' }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={toggleTheme}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Toggle Theme"
          >
            {isLight ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <Bell size={20} />
          </button>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <Settings size={20} />
          </button>
        </div>
        <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)' }}></div>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--panel-bg)', borderRadius: '50%', padding: '8px', border: '1px solid var(--panel-border)' }}>
            <User size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>SOC Analyst</div>
            <div className="text-muted text-xs">Tier 2 Responders</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
