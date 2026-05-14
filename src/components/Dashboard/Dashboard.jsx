import React, { useState, useEffect } from 'react';

function StatusIndicator({ label, status = 'ok' }) {
  const statusConfig = {
    ok: { color: 'bg-green-500', text: 'Operational' },
    warning: { color: 'bg-yellow-500', text: 'Warning' },
    error: { color: 'bg-red-500', text: 'Error' },
  };

  const config = statusConfig[status] || statusConfig.ok;

  return (
    <div className="bg-gray-800/60 p-4 rounded-lg flex items-center justify-between border border-gray-700">
      <span className="text-gray-300">{label}</span>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${config.color} ${status !== 'ok' ? 'animate-pulse' : ''}`}></div>
        <span className="text-sm text-gray-400">{config.text}</span>
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
    <div className="p-4 md:p-6 text-gray-200" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            High-level overview of core systems.
          </p>
        </div>
        
        {/* System Status Card */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">System Status</h2>
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