import React from "react"
import { Navigate, useLocation } from "react-router-dom"
import { ShieldAlert, ArrowRight, LogOut } from "lucide-react"
import { getCurrentUser, isAuthenticated, logoutUser } from "../lib/auth"

export interface AuthGuardProps {
  allowedRoles?: string[] | string
  fallbackPath?: string
  children?: React.ReactNode
}

/**
 * Protected route wrapper component that verifies JWT authentication
 * and enforces role-based access control.
 */
export default function AuthGuard({
  allowedRoles,
  fallbackPath,
  children,
}: AuthGuardProps): React.ReactElement | null {
  const location = useLocation()
  const isAuth = isAuthenticated()
  const user = getCurrentUser()

  // 1. Unauthenticated check: redirect to /login
  if (!isAuth || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Role-based check
  if (allowedRoles) {
    const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    const userRole = (user.role || "").toUpperCase()
    const isAuthorized = rolesList.some(
      (role) => role.toUpperCase() === userRole || userRole === "ADMIN"
    )

    if (!isAuthorized) {
      if (fallbackPath) {
        return <Navigate to={fallbackPath} replace />
      }

      // If a candidate tries to access recruiter routes, redirect to candidate portal
      if (userRole === "CANDIDATE") {
        return <Navigate to="/candidate/jobs" replace />
      }

      // Default access restricted UI
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
              <ShieldAlert className="size-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Access Restricted
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              You are signed in as{" "}
              <span className="font-semibold text-slate-800">
                {user.email} ({user.role})
              </span>
              . This portal requires recruiter privileges.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => (window.location.href = "/candidate/jobs")}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Go to Candidate Portal <ArrowRight className="size-4" />
              </button>

              <button
                type="button"
                onClick={() => logoutUser()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="size-4 text-slate-500" /> Switch Account
              </button>
            </div>
          </div>
        </div>
      )
    }
  }

  // 3. Authorized
  return children ? <>{children}</> : null
}
