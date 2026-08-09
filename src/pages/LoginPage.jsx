import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "/api";
      const res = await fetch(`${apiBase.replace(/\/+$/, '')}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem("auth", "true");
        sessionStorage.setItem("token", data.token);
        navigate("/");
      } else {
        setError("Invalid password");
        setPassword("");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        fontFamily: "'Roboto Mono', monospace",
        backgroundColor: 'var(--background-base)',
        color: 'var(--text-primary)',
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--surface-layer)',
          borderColor: 'var(--primary-accent)',
        }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary-accent)' }}>Secure Access</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your password to continue</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          minLength={8}
          placeholder="Enter your password"
          className="w-full rounded-lg border p-3 text-center text-xl tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2"
          style={{
            backgroundColor: 'var(--background-base)',
            borderColor: error ? 'var(--warning-attention)' : 'var(--primary-accent)',
            boxShadow: error ? '0 0 0 1px var(--warning-attention)' : '0 0 0 1px transparent',
          }}
        />

        {error && (
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--warning-attention)' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          className="mt-5 w-full rounded-lg p-3 font-semibold transition-colors"
          style={{
            backgroundColor: 'var(--primary-accent)',
            color: 'var(--background-base)',
          }}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Enter'}
        </button>
      </div>
    </div>
  );
}

export default Login;
