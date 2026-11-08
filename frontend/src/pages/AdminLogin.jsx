import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AdminLogin() {
const navigate = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

const handleLogin = async (event) => {
event.preventDefault();

setError("");

if (!email.trim()) {
  setError("Please enter your email.");
  return;
}

if (!password) {
  setError("Please enter your password.");
  return;
}

try {
  setLoading(true);

  const response = await fetch(
    `${API_URL}/api/admin/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: email.trim(),
        password
      })
    }
  );

  const data = await response.json();

  console.log("Admin login response:", data);

  if (!response.ok) {
    setError(
      data.message || "Admin login failed."
    );
    return;
  }

  if (!data.data?.token) {
    setError(
      "Login succeeded but no authentication token was returned."
    );
    return;
  }

  sessionStorage.setItem(
    "adminToken",
    data.data.token
  );

  navigate("/admin/students");

} catch (error) {
  console.error(
    "Admin login error:",
    error
  );

  setError(
    "Could not connect to the backend."
  );
} finally {
  setLoading(false);
}

};

return (
<div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">

  <div className="w-full max-w-md">

    <div className="mb-8 text-center">

      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-2xl font-bold">
        A
      </div>

      <h1 className="text-3xl font-bold">
        Attendify Admin
      </h1>

      <p className="mt-2 text-slate-400">
        Sign in to manage attendance
      </p>

    </div>

    <div className="rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-xl">

      <form onSubmit={handleLogin}>

        <div className="mb-5">

          <label className="mb-2 block text-sm font-medium text-slate-300">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Enter admin email"
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
          />

        </div>

        <div className="mb-6">

          <label className="mb-2 block text-sm font-medium text-slate-300">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-500"
          />

        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-500 px-5 py-3 font-semibold transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Signing in..."
            : "Sign In"}
        </button>

      </form>

      <div className="mt-6 text-center">

        <a
          href="/"
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← Back to Attendify
        </a>

      </div>

    </div>

  </div>

</div>

);
}

export default AdminLogin