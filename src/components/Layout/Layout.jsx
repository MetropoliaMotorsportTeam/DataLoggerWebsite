import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Firmware', path: '/firmware' },
    { name: 'Data Monitoring', path: '/data' },
    { name: 'Car Settings', path: '/settings' },
    { name: 'Sessions', path: '/sessions' },
    { name: 'Packing List', path: '/packinglist' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-gray-200" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      {/* Header */}
      <header className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Team Name */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-gray-800 p-2 rounded-lg">
                <svg className="h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <span className="font-bold text-xl text-white hidden sm:block">Metropolia Motorsport</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-white bg-blue-600/50'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
              >
                Logout
              </button>
            </nav>

            {/* Mobile Menu Placeholder (optional) */}
            <div className="md:hidden">
              {/* You can add a hamburger menu icon here if needed */}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav Bar */}
      <div className="md:hidden bg-gray-900/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex overflow-x-auto space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 bg-gray-800/60 hover:bg-gray-700/60'
              }`}
            >
              {item.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex-shrink-0 text-sm px-3 py-1.5 rounded-md bg-red-600 text-white ml-2 hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content - No extra styling to allow pages to be full-bleed */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4 md:flex md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Metropolia Motorsport. All rights reserved.</p>
          </div>
          <div className="mt-4 flex justify-center space-x-6 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              Docs
            </a>
            
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;