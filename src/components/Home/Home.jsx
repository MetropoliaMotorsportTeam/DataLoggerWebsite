import React from 'react';

function Home() {


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to the dashboard. Monitor vehicle's status. *MOCK DATA AT THE MOMENT*
        </p>
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
      
     
    

    </div>
  );
}

export default Home;