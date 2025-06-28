import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Firmware', path: '/firmware' },
    { name: 'Data Analysis', path: '/data' },
    { name: 'Car Settings', path: '/settings' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 shadow-xl">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded">
              <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.5 1.5c-6.3 0-11 4.7-11 11 0 6.3 4.7 11 11 11s11-4.7 11-11c0-6.3-4.7-11-11-11zm-1 16h-5v-2h5v2zm7-4h-12v-2h12v2zm0-4h-12v-2h12v2z"></path>
              </svg>
            </div>
            <span className="font-bold text-xl text-white">Metropolia Motorsport</span>
          </Link>
          
          <nav className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium px-2 py-1 rounded transition-colors ${
                  location.pathname === item.path
                    ? 'text-white bg-blue-700'
                    : 'text-blue-100 hover:text-white hover:bg-blue-700/50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white shadow-md">
        <div className="container mx-auto px-4 py-2 flex overflow-x-auto space-x-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`whitespace-nowrap text-sm px-3 py-1 rounded-full transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="font-bold text-lg">Metropolia Motorsport</div>
              <p className="text-gray-300 text-sm">Manage and visualize data.</p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-white transition-colors">Documentation</a>

            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;