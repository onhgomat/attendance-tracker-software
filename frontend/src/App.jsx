
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Attendance from "./pages/Attendance";
import AdminLogin from "./pages/AdminLogin";
import AdminStudents from "./pages/AdminStudents";
import AdminDashboard from "./pages/AdminDashboard";

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div className="flex items-center gap-3">

            {/* IEM Logo */}
            <img
              src="/iem.png"
              alt="IEM Logo"
              className="h-11 w-11 rounded-xl bg-white object-contain p-1"
            />

            <div>
              <h1 className="text-xl font-bold">
                Attendify
              </h1>

              <p className="text-xs text-slate-400">
                IEM Attendance System
              </p>
            </div>

          </div>

          <div className="flex items-center gap-3">

            <a
              href="/attendance"
              className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-indigo-400"
            >
              Mark Attendance
            </a>

            <a
              href="/admin/login"
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Admin Login
            </a>

          </div>

        </div>
      </nav>

      <main className="mx-auto flex min-h-[80vh] max-w-7xl items-center px-6">

        <div className="max-w-4xl">

          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-indigo-400">
            IEM Attendance
          </p>

          <h2 className="text-5xl font-bold leading-tight sm:text-6xl lg:text-7xl">
            Smart attendance.
            <br />

            <span className="text-indigo-400">
              Made simple.
            </span>
          </h2>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Attendify verifies students using their enrollment
            number and registered face, then automatically records
            attendance.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">

            <a
              href="/attendance"
              className="rounded-xl bg-indigo-500 px-7 py-4 font-semibold transition hover:bg-indigo-400"
            >
              Mark Attendance
            </a>

            <a
              href="/admin/login"
              className="rounded-xl border border-white/10 px-7 py-4 font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Admin Portal
            </a>

          </div>

          <div className="mt-14 grid max-w-2xl gap-4 sm:grid-cols-3">

            <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm font-semibold text-white">
                Face Verification
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Registered face matching using the face service.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm font-semibold text-white">
                Automatic Attendance
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Successful verification records attendance.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900 p-5">
              <p className="text-sm font-semibold text-white">
                Admin Review
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Low-confidence requests can be reviewed by admin.
              </p>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Home />} />

        <Route path="/attendance" element={<Attendance />} />

        <Route path="/admin/login" element={<AdminLogin />} />

        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        <Route path="/admin/students" element={<AdminStudents />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
