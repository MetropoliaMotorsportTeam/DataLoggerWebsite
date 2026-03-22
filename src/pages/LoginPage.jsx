import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (pin === "123") {
      sessionStorage.setItem("auth", "true");
      navigate("/");
    } else {
      setError("Invalid PIN");
      setPin("");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-gray-200 bg-gray-950"
      style={{ fontFamily: "'Roboto Mono', monospace" }}
    >
      <div className="w-full max-w-md bg-gray-900/50 border border-gray-700 rounded-lg p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Secure Access</h1>
          <p className="text-gray-400 text-sm">Enter your PIN to continue</p>
        </div>

        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          maxLength={3}
          placeholder="•••"
          className={`w-full bg-gray-800 border ${
            error ? "border-red-500" : "border-gray-700"
          } rounded-lg p-3 text-center text-xl tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />

        {error && (
          <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 transition rounded-lg p-3 text-white font-semibold"
        >
          Enter
        </button>
      </div>
    </div>
  );
}

export default Login;
