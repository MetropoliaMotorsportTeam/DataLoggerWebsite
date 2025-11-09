import React from 'react';

// A dedicated component for status indicators for cleaner code
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

function Home() {
  // Mock data for system statuses
  const systemStatuses = [
    { name: 'Battery', status: 'ok' },
    { name: 'Motor', status: 'ok' },
    { name: 'Cooling', status: 'ok' },
    { name: 'Inverter', status: 'ok' },
    { name: 'Telemetry', status: 'warning' },
    { name: 'ECU', status: 'ok' },
    { name: 'BMS', status: 'error' },
    { name: 'Connectivity', status: 'ok' },
  ];

  return (
    <div className="p-4 md:p-6 text-gray-200" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">
            High-level overview of the vehicle's core systems.
          </p>
        </div>
        
        {/* System Status Card */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">System Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemStatuses.map((system) => (
              <StatusIndicator key={system.name} label={system.name} status={system.status} />
            ))}
          </div>
        </div>

        {/* Placeholder for more dashboard widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-5 shadow-2xl h-64">
                <h2 className="text-xl font-semibold mb-4 text-gray-100">Tire Temperatures</h2>
                <p className="text-gray-500">Widget placeholder...</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-5 shadow-2xl h-64">
                <h2 className="text-xl font-semibold mb-4 text-gray-100">Lap Times</h2>
                <p className="text-gray-500">Widget placeholder...</p>
            </div>
        </div>
      </div>
    </div>
  );
}

export default Home;