import React, { Suspense, lazy } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import AuthGuard from "./components/AuthGuard"

// Code-split route components for optimized bundle chunking
const Landing = lazy(() => import("./pages/Landing"))
const Login = lazy(() => import("./pages/Auth/Login"))
const Register = lazy(() => import("./pages/Auth/Register"))
const RecruiterPipeline = lazy(() => import("./pages/RecruiterPipeline"))
const CandidateJobs = lazy(() => import("./pages/CandidateJobs"))
const CandidateApplications = lazy(() => import("./pages/CandidateApplications"))

function RouteLoadingSpinner(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="size-9 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Loading SmartATS...</p>
      </div>
    </div>
  )
}

export default function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingSpinner />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Recruiter Workspace Route */}
          <Route
            path="/recruiter/pipeline"
            element={
              <AuthGuard allowedRoles={["RECRUITER", "ADMIN"]}>
                <RecruiterPipeline />
              </AuthGuard>
            }
          />
          <Route
            path="/recruiter"
            element={<Navigate to="/recruiter/pipeline" replace />}
          />

          {/* Protected Candidate Portal Routes */}
          <Route
            path="/candidate/jobs"
            element={
              <AuthGuard allowedRoles={["CANDIDATE", "ADMIN", "RECRUITER"]}>
                <CandidateJobs />
              </AuthGuard>
            }
          />
          <Route
            path="/candidate/applications"
            element={
              <AuthGuard allowedRoles={["CANDIDATE", "ADMIN"]}>
                <CandidateApplications />
              </AuthGuard>
            }
          />
          <Route
            path="/candidate"
            element={<Navigate to="/candidate/jobs" replace />}
          />
          <Route path="/jobs" element={<Navigate to="/candidate/jobs" replace />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
