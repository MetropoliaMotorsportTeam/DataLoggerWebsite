import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from './Footer';

function Layout({ children }) {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Firmware', path: '/firmware' },
    { name: 'Data Monitoring', path: '/data' },
    { name: 'Car Settings', path: '/settings' },
    { name: 'Sessions', path: '/sessions' },
    { name: 'Packing List', path: '/packinglist' },
    { name: 'Pedal Mapping', path: '/pedalmapping' },
  ];

  const handleLogout = () => {
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Roboto Mono', monospace", backgroundColor: 'var(--background-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20" style={{ backgroundColor: 'var(--surface-layer)', borderBottom: '1px solid var(--primary-accent)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Team Name */}
            <Link to="/" className="flex items-center space-x-3">
              <img src="/logofront.PNG" alt="Logo" className="h-16" />
              <span className="font-bold text-xl hidden sm:block" style={{ color: 'var(--text-primary)' }}>Metropolia Motorsport</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.path
                      ? 'text-white'
                      : ''
                  }`}
                  style={{
                    backgroundColor: location.pathname === item.path ? 'var(--primary-accent)' : 'transparent',
                    color: location.pathname === item.path ? 'var(--background-base)' : 'var(--text-secondary)',
                  }}
                >
                  {item.name}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="ml-4 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                style={{ backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)'}}
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
      <div className="md:hidden" style={{ backgroundColor: 'var(--surface-layer)', borderBottom: '1px solid var(--primary-accent)' }}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex overflow-x-auto space-x-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-md transition-colors`}
              style={{
                backgroundColor: location.pathname === item.path ? 'var(--primary-accent)' : 'var(--surface-layer)',
                color: location.pathname === item.path ? 'var(--background-base)' : 'var(--text-secondary)',
              }}
            >
              {item.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex-shrink-0 text-sm px-3 py-1.5 rounded-md ml-2"
            style={{ backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)'}}
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
      <Footer />
    </div>
  );
}

export default Layout;