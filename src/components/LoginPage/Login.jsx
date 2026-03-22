import React, { useState } from "react";

function Login() {
  const [pin, setPin] = useState("");

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 text-gray-200"
      style={{ fontFamily: "'Roboto Mono', monospace" }}
    >
      <div className="w-full max-w-md bg-gray-900/50 border border-gray-700 rounded-lg p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Enter PIN Code</h1>
          <p className="text-gray-400 text-sm">
            Please enter your access code to continue.
          </p>
        </div>

        {/* Input */}
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={6}
          placeholder="••••••"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-center text-xl tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Button */}
        <button className="mt-5 w-full bg-blue-600 hover:bg-blue-700 transition rounded-lg p-3 text-white font-semibold">
          Continue
        </button>
      </div>
    </div>
  );
}

export default Login;
