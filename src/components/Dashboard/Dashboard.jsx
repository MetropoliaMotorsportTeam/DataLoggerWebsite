import React, { useState, useEffect } from 'react';

function StatusIndicator({ label, status = 'ok' }) {
  const statusConfig = {
    ok: { color: 'var(--success-positive)', text: 'Operational' },
    warning: { color: 'var(--warning-attention)', text: 'Warning' },
    error: { color: 'var(--warning-attention)', text: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.ok;

  return (
    <div className="p-4 rounded-lg flex items-center justify-between" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)'}}>
      <span style={{ color: 'var(--text-primary)' }}>{label}</span>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: config.color, animation: status !== 'ok' ? 'pulse 1.5s infinite' : 'none' }}></div>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{config.text}</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const [systemStatuses, setSystemStatuses] = useState([]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        const statuses = Object.entries(data).map(([name, status]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          status,
        }));
        setSystemStatuses(statuses);
      } catch (error) {
        console.error("Failed to fetch system status:", error);
        // Set to error state if fetch fails
        setSystemStatuses([
          { name: 'Telemetry', status: 'error' },
          { name: 'AWS', status: 'error' },
          { name: 'Python Workers', status: 'error' },
        ]);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 md:p-6" style={{ fontFamily: "'Roboto Mono', monospace", color: 'var(--text-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            High-level overview of core systems.
          </p>
        </div>
        
        {/* System Status Card */}
        <div className="rounded-lg p-5 shadow-2xl" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>System Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemStatuses.length > 0 ? (
              systemStatuses.map((system) => (
                <StatusIndicator key={system.name} label={system.name} status={system.status} />
              ))
            ) : (
              <p>Loading system status...</p>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
}

export default Dashboard;