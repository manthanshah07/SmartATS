import React from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import AuthGuard from "./components/AuthGuard"
import Login from "./pages/Auth/Login"
import Register from "./pages/Auth/Register"
import CandidateJobs from "./pages/CandidateJobs"
import Landing from "./pages/Landing"
import RecruiterPipeline from "./pages/RecruiterPipeline"

export default function App() {
  return (
    <BrowserRouter>
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

        {/* Protected Candidate Portal Route */}
        <Route
          path="/candidate/jobs"
          element={
            <AuthGuard allowedRoles={["CANDIDATE", "ADMIN", "RECRUITER"]}>
              <CandidateJobs />
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
    </BrowserRouter>
  )
}
