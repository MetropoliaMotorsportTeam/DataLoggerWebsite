import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from './Footer';

function Layout({ children }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Roboto Mono', monospace", backgroundColor: 'var(--background-base)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20" style={{ backgroundColor: 'var(--surface-layer)', borderBottom: '1px solid var(--primary-accent)' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3" onClick={closeMenu}>
              <img src="/logofront.PNG" alt="Logo" className="h-10" />
              <span className="font-bold text-lg hidden sm:block" style={{ color: 'var(--text-primary)' }}>Metropolia Motorsport</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
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
                className="ml-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                style={{ backgroundColor: 'var(--warning-attention)', color: 'var(--background-base)' }}
              >
                Logout
              </button>
            </nav>

            {/* Hamburger button (mobile only) */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-md gap-1.5"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--primary-accent)' }}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text-primary)', transition: 'transform 0.2s', transform: menuOpen ? 'translateY(5px) rotate(45deg)' : 'none' }} />
              <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text-primary)', opacity: menuOpen ? 0 : 1, transition: 'opacity 0.2s' }} />
              <span style={{ display: 'block', width: '20px', height: '2px', background: 'var(--text-primary)', transition: 'transform 0.2s', transform: menuOpen ? 'translateY(-5px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay — position:fixed so it can never be clipped by the sticky header */}
      {menuOpen && (
        <>
          {/* Dark backdrop — tap anywhere outside panel to close */}
          <div
            onClick={closeMenu}
            style={{
              position: 'fixed',
              inset: 0,
              top: 56,
              zIndex: 998,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          />
          {/* Nav panel */}
          <div
            style={{
              position: 'fixed',
              top: 56,
              left: 0,
              right: 0,
              zIndex: 999,
              backgroundColor: 'var(--surface-layer)',
              borderBottom: '2px solid var(--primary-accent)',
              padding: '12px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none',
                    backgroundColor: isActive ? 'var(--primary-accent)' : 'rgba(255,255,255,0.06)',
                    color: isActive ? '#121212' : 'var(--text-primary)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => { closeMenu(); handleLogout(); }}
              style={{
                marginTop: 4,
                padding: '12px 16px',
                borderRadius: 8,
                border: 'none',
                fontSize: 15,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
                backgroundColor: 'var(--warning-attention)',
                color: '#121212',
                fontFamily: "'Roboto Mono', monospace",
              }}
            >
              Logout
            </button>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 w-full">
        {children}
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
