import React from 'react';

function Footer() {
  return (
    <footer
      style={{
        backgroundColor: 'var(--surface-layer)',
        color: 'var(--text-secondary)',
        padding: '1rem',
        textAlign: 'center',
        borderTop: '1px solid var(--primary-accent)',
        fontFamily: "'Roboto Mono', monospace",
      }}
    >
      <p>&copy; {new Date().getFullYear()} Metropolia Motorsport. All rights reserved.</p>
    </footer>
  );
}

export default Footer;