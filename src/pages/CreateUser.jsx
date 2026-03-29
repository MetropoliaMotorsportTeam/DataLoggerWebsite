import React, { useState } from "react";

function CreateUser() {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const apiBase = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${apiBase}/login/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("User created! Remove this endpoint now.");
        setPin("");
      } else {
        setError(data.error || "Failed to create user");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-gray-200 bg-gray-950">
      <div className="w-full max-w-md bg-gray-900/50 border border-gray-700 rounded-lg p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Create User (TEMP)</h1>
          <p className="text-gray-400 text-sm">Set initial PIN code</p>
        </div>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          maxLength={4}
          placeholder="•••"
          className={`w-full bg-gray-800 border ${error ? "border-red-500" : "border-gray-700"} rounded-lg p-3 text-center text-xl tracking-widest text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
        {message && <p className="text-green-500 text-sm mt-2 text-center">{message}</p>}
        <button
          onClick={handleCreate}
          className="mt-5 w-full bg-green-600 hover:bg-green-700 transition rounded-lg p-3 text-white font-semibold"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </div>
  );
}

export default CreateUser;
