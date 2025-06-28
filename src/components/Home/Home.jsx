import React from 'react';

function Home() {
  // Sample data for dashboard cards
  const stats = [
    { title: 'Battery Status', value: '87%', change: '+2%', status: 'positive' },
    { title: 'Motor Temp', value: '52°C', change: '-3°C', status: 'positive' },
    { title: 'Latest Run', value: '2:14.35', change: '-0:01.22', status: 'positive' },
    { title: 'Data Sessions', value: '24', change: '+3', status: 'neutral' },
  ];

  // Sample recent activities
  const activities = [
    { action: 'Firmware Update', target: 'ECU v2.3.1', time: '2 hours ago', user: 'Alex' },
    { action: 'Data Upload', target: 'Test Run #42', time: '5 hours ago', user: 'Jordan' },
    { action: 'Parameter Change', target: 'Regen Braking', time: '1 day ago', user: 'Sam' },
    { action: 'System Check', target: 'Pre-competition', time: '2 days ago', user: 'Taylor' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to the dashboard. Monitor your vehicle's performance and manage systems.
        </p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-sm font-medium text-gray-500">{stat.title}</h2>
            <div className="flex items-baseline mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className={`ml-2 text-sm ${
                stat.status === 'positive' ? 'text-green-600' : 
                stat.status === 'negative' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {stat.change}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* System Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-green-100">
              <span className="block w-8 h-8 rounded-full bg-green-500"></span>
            </div>
            <p className="mt-2 text-sm font-medium">Battery</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-green-100">
              <span className="block w-8 h-8 rounded-full bg-green-500"></span>
            </div>
            <p className="mt-2 text-sm font-medium">Motor</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-green-100">
              <span className="block w-8 h-8 rounded-full bg-green-500"></span>
            </div>
            <p className="mt-2 text-sm font-medium">Cooling</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-green-100">
              <span className="block w-8 h-8 rounded-full bg-green-500"></span>
            </div>
            <p className="mt-2 text-sm font-medium">Inverter</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-yellow-100">
              <span className="block w-8 h-8 rounded-full bg-yellow-500"></span>
            </div>
            <p className="mt-2 text-sm font-medium">Telemetry</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-green-100">
              <span className="block w-8 h-8 rounded-full bg-green-500"></span>
            </div>
            <p className="mt-2 text-sm font-medium">ECU</p>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {activities.map((activity, index) => (
              <li key={index} className="py-3">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action} - <span className="font-semibold">{activity.target}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {activity.time} by {activity.user}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all activity →
          </button>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="flex space-x-4">
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors">
          Upload New Data
        </button>
        <button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors">
          Start Diagnostics
        </button>
        <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors">
          Export Reports
        </button>
      </div>
    </div>
  );
}

export default Home;