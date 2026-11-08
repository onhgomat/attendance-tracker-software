
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AdminDashboard() {
  const navigate = useNavigate();

  // Attendance states
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  // Activity log states
  const [activeTab, setActiveTab] = useState("attendance");
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalRecords: 0,
    currentPage: 1,
    totalPages: 0,
    limit: 10,
    hasNextPage: false,
    hasPreviousPage: false
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const token = sessionStorage.getItem("adminToken");

  // ==========================================
  // FETCH PENDING ATTENDANCE REQUESTS
  // ==========================================

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      const response = await fetch(
        `${API_URL}/api/attendance/pending`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to load attendance requests.");
        return;
      }

      setRequests(data.data || []);

    } catch (err) {
      console.error("Pending attendance error:", err);
      setError("Could not connect to the backend.");

    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FETCH MYSQL ACTIVITY LOGS
  // ==========================================

  const fetchActivityLogs = async (
    page = 1,
    action = activityFilter
  ) => {
    try {
      setActivityLoading(true);
      setActivityError("");

      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      const params = new URLSearchParams({
        page: String(page),
        limit: "10"
      });

      if (action) {
        params.append("action", action);
      }

      const response = await fetch(
        `${API_URL}/api/admin/activity-logs?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setActivityError(
          data.message || "Failed to retrieve activity logs."
        );
        return;
      }

      setActivityLogs(data.data || []);
      setPagination(data.pagination || {
        totalRecords: 0,
        currentPage: 1,
        totalPages: 0,
        limit: 10,
        hasNextPage: false,
        hasPreviousPage: false
      });

      setCurrentPage(page);

    } catch (err) {
      console.error("Activity logs error:", err);
      setActivityError("Could not connect to the backend.");

    } finally {
      setActivityLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // ==========================================
  // REVIEW ATTENDANCE REQUEST
  // ==========================================

  const reviewRequest = async (requestId, decision) => {
    try {
      setReviewingId(requestId);
      setError("");

      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      const response = await fetch(
        `${API_URL}/api/attendance/${requestId}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ decision })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Failed to review attendance request."
        );
        return;
      }

      setRequests((currentRequests) =>
        currentRequests.filter(
          (request) => request._id !== requestId
        )
      );

    } catch (err) {
      console.error("Attendance review error:", err);
      setError("Could not connect to the backend.");

    } finally {
      setReviewingId(null);
    }
  };

  // ==========================================
  // ACTIVITY FILTER
  // ==========================================

  const handleFilterChange = (event) => {
    const action = event.target.value;

    setActivityFilter(action);
    setSelectedLog(null);
    fetchActivityLogs(1, action);
  };

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("admin");

    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin");

    navigate("/", { replace: true });
  };

  // ==========================================
  // DATE FORMAT
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "N/A";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "N/A";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // ==========================================
  // ACTIVITY STATUS COLOR
  // ==========================================

  const getActionColor = (action) => {
    if (action.includes("REJECTED")) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }

    if (
      action.includes("APPROVED") ||
      action.includes("CREATED") ||
      action.includes("LOGIN") ||
      action.includes("REGISTERED")
    ) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }

    return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}

      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold">
              Attendify Admin
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Attendance Management System
            </p>
          </div>

          <div className="flex items-center gap-3">

            <a
              href="/admin/students"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Students
            </a>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
            >
              Logout
            </button>

          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">

        {/* PAGE HEADER */}

        <div className="mb-8">

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-400">
            Admin Portal
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            Dashboard
          </h2>

          <p className="mt-3 text-slate-400">
            Manage attendance requests and monitor administrative activities.
          </p>

        </div>

        {/* TABS */}

        <div className="mb-8 flex flex-wrap gap-3 border-b border-white/10 pb-4">

          <button
            onClick={() => setActiveTab("attendance")}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "attendance"
                ? "bg-indigo-500 text-white"
                : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Attendance Requests
          </button>

          <button
            onClick={() => {
              setActiveTab("logs");

              if (activeTab !== "logs") {
                fetchActivityLogs(1, activityFilter);
              }
            }}
            className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
              activeTab === "logs"
                ? "bg-indigo-500 text-white"
                : "border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Activity Logs
          </button>

        </div>

        {/* ======================================
            ATTENDANCE TAB
        ====================================== */}

        {activeTab === "attendance" && (

          <>

            <div className="mb-6 flex justify-end">
              <button
                onClick={fetchPendingRequests}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Refresh Requests
              </button>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mb-8 grid gap-4 sm:grid-cols-3">

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Pending Requests
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {requests.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Verification Rule
                </p>

                <p className="mt-2 text-3xl font-bold">
                  60%
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Minimum face-match score
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  System
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-400">
                  Active
                </p>
              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900">

              <div className="border-b border-white/10 px-6 py-5">
                <h3 className="text-lg font-semibold">
                  Pending Attendance
                </h3>
              </div>

              {loading ? (
                <div className="px-6 py-12 text-center text-slate-400">
                  Loading attendance requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="px-6 py-12 text-center">

                  <p className="text-lg font-semibold text-slate-300">
                    No pending requests
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    All attendance requests have been reviewed.
                  </p>

                </div>
              ) : (

                <div className="divide-y divide-white/10">

                  {requests.map((request) => (

                    <div key={request._id} className="p-6">

                      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">

                        <div className="space-y-5">

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Student
                            </p>

                            <p className="mt-1 text-xl font-semibold text-white">
                              {request.studentName}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Enrollment
                            </p>

                            <p className="mt-1 font-semibold text-white">
                              {request.enrollmentNumber}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Match Score
                            </p>

                            <p className="mt-1 text-2xl font-bold text-amber-400">
                              {request.faceMatchScore}%
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Below automatic verification threshold
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">
                              Attendance Date
                            </p>

                            <p className="mt-1 font-semibold text-white">
                              {request.attendanceDay}
                            </p>
                          </div>

                        </div>

                        <div>

                          <p className="mb-4 text-sm font-semibold text-slate-300">
                            Face Comparison
                          </p>

                          <div className="grid gap-5 sm:grid-cols-2">

                            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">

                              <p className="mb-3 text-sm font-semibold text-slate-400">
                                Registered Face
                              </p>

                              <div className="aspect-square overflow-hidden rounded-xl bg-slate-800">

                                {request.student?.registrationFaceImage ? (
                                  <img
                                    src={request.student.registrationFaceImage}
                                    alt="Registered face"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                                    Registered face image unavailable
                                  </div>
                                )}

                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-slate-950 p-4">

                              <p className="mb-3 text-sm font-semibold text-slate-400">
                                Attendance Face
                              </p>

                              <div className="aspect-square overflow-hidden rounded-xl bg-slate-800">

                                {request.attendanceFaceImage ? (
                                  <img
                                    src={request.attendanceFaceImage}
                                    alt="Attendance verification face"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
                                    Attendance face image unavailable
                                  </div>
                                )}

                              </div>
                            </div>

                          </div>
                        </div>

                      </div>

                      <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-end">

                        <button
                          onClick={() =>
                            reviewRequest(request._id, "present")
                          }
                          disabled={reviewingId === request._id}
                          className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reviewingId === request._id
                            ? "Processing..."
                            : "Mark Present"}
                        </button>

                        <button
                          onClick={() =>
                            reviewRequest(request._id, "absent")
                          }
                          disabled={reviewingId === request._id}
                          className="rounded-xl bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reviewingId === request._id
                            ? "Processing..."
                            : "Mark Absent"}
                        </button>

                      </div>

                    </div>

                  ))}

                </div>

              )}

            </div>

          </>

        )}

        {/* ======================================
            ACTIVITY LOGS TAB
        ====================================== */}

        {activeTab === "logs" && (

          <>

            {/* LOG SUMMARY */}

            <div className="mb-8 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Total Activity Records
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {pagination.totalRecords}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <p className="text-sm text-slate-400">
                  Current Page
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {pagination.currentPage || currentPage}
                </p>
              </div>

            </div>

            {/* FILTERS */}

            <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="text-lg font-semibold">
                  Administrative Activity
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Audit history stored in MySQL.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <select
                  value={activityFilter}
                  onChange={handleFilterChange}
                  className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                >
                  <option value="">All Activities</option>
                  <option value="ADMIN_LOGIN">Admin Login</option>
                  <option value="ADMIN_REGISTERED">Admin Registered</option>
                  <option value="ATTENDANCE_REQUEST_CREATED">Request Created</option>
                  <option value="ATTENDANCE_AUTO_APPROVED">Auto Approved</option>
                  <option value="ATTENDANCE_APPROVED">Attendance Approved</option>
                  <option value="ATTENDANCE_REJECTED">Attendance Rejected</option>
                  <option value="ATTENDANCE_RECORD_CREATED">Record Created</option>
                </select>

                <button
                  onClick={() => fetchActivityLogs(currentPage)}
                  disabled={activityLoading}
                  className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {activityLoading ? "Refreshing..." : "Refresh Logs"}
                </button>

              </div>

            </div>

            {/* ERROR */}

            {activityError && (
              <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
                {activityError}
              </div>
            )}

            {/* LOG TABLE */}

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">

              <div className="border-b border-white/10 px-6 py-5">
                <h3 className="text-lg font-semibold">
                  Activity History
                </h3>
              </div>

              {activityLoading ? (

                <div className="px-6 py-16 text-center text-slate-400">
                  Loading activity logs...
                </div>

              ) : activityLogs.length === 0 ? (

                <div className="px-6 py-16 text-center">

                  <p className="text-lg font-semibold text-slate-300">
                    No activity records found
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Activities will appear here when administrative actions are performed.
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-sm">

                    <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400">

                      <tr>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Entity</th>
                        <th className="px-6 py-4">Admin ID</th>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Details</th>
                      </tr>

                    </thead>

                    <tbody className="divide-y divide-white/10">

                      {activityLogs.map((log) => (

                        <React.Fragment key={log.id}>

                          <tr className="transition hover:bg-white/[0.03]">

                            <td className="whitespace-nowrap px-6 py-5 text-slate-400">
                              #{log.id}
                            </td>

                            <td className="whitespace-nowrap px-6 py-5">

                              <span className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold ${getActionColor(log.action)}`}>
                                {log.action}
                              </span>

                            </td>

                            <td className="whitespace-nowrap px-6 py-5 text-slate-300">
                              {log.entityType || "N/A"}
                            </td>

                            <td className="max-w-[150px] truncate px-6 py-5 text-slate-400" title={log.adminId || ""}>
                              {log.adminId || "System"}
                            </td>

                            <td className="whitespace-nowrap px-6 py-5 text-slate-400">
                              {formatDate(log.createdAt)}
                            </td>

                            <td className="whitespace-nowrap px-6 py-5">

                              <button
                                onClick={() =>
                                  setSelectedLog(
                                    selectedLog === log.id ? null : log.id
                                  )
                                }
                                className="rounded-lg border border-indigo-500/30 px-3 py-2 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/10"
                              >
                                {selectedLog === log.id
                                  ? "Hide Details"
                                  : "View Details"}
                              </button>

                            </td>

                          </tr>

                          {selectedLog === log.id && (

                            <tr className="bg-slate-950/70">

                              <td colSpan="6" className="px-6 py-6">

                                <div className="grid gap-5 md:grid-cols-2">

                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                      Entity ID
                                    </p>

                                    <p className="break-all text-sm text-slate-300">
                                      {log.entityId || "N/A"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                      IP Address
                                    </p>

                                    <p className="text-sm text-slate-300">
                                      {log.ipAddress || "N/A"}
                                    </p>
                                  </div>

                                  <div className="md:col-span-2">

                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                      Additional Details
                                    </p>

                                    <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900 p-4 text-xs leading-6 text-emerald-300">
                                      {log.details
                                        ? JSON.stringify(log.details, null, 2)
                                        : "No additional details available."}
                                    </pre>

                                  </div>

                                  <div className="md:col-span-2">

                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                      User Agent
                                    </p>

                                    <p className="break-all text-xs text-slate-400">
                                      {log.userAgent || "N/A"}
                                    </p>

                                  </div>

                                </div>

                              </td>

                            </tr>

                          )}

                        </React.Fragment>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

              {/* PAGINATION */}

              <div className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

                <p className="text-sm text-slate-400">
                  Showing {activityLogs.length} records on page {currentPage}
                  {" "}of {pagination.totalPages || 1}
                  {" "}· Total {pagination.totalRecords} records
                </p>

                <div className="flex gap-3">

                  <button
                    onClick={() => fetchActivityLogs(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage || activityLoading}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => fetchActivityLogs(currentPage + 1)}
                    disabled={!pagination.hasNextPage || activityLoading}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next
                  </button>

                </div>

              </div>

            </div>

          </>

        )}

      </main>
    </div>
  );
}

export default AdminDashboard;
