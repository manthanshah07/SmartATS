import React, { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
} from "lucide-react"
import axios, { AxiosError } from "axios"
import api from "../../lib/api"
import { setAuthSession } from "../../lib/auth"

interface LocationState {
  from?: { pathname?: string }
  demoEmail?: string
  demoPassword?: string
}

export default function Login(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | undefined

  const [email, setEmail] = useState<string>(state?.demoEmail || "")
  const [password, setPassword] = useState<string>(state?.demoPassword || "")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (state?.demoEmail) {
      setEmail(state.demoEmail)
    }
    if (state?.demoPassword) {
      setPassword(state.demoPassword)
    }
  }, [state])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both email address and password.")
      return
    }

    setLoading(true)

    try {
      const response = await api.post("/auth/login/", {
        email: trimmedEmail,
        password,
      })

      const data = response.data
      const user = data.user || {}
      const role = (user.role || "").toUpperCase()

      // Save tokens & user data to localStorage
      setAuthSession({
        access: data.access,
        refresh: data.refresh,
        user,
      })

      const destination = state?.from?.pathname

      // Redirect based on role or original destination
      if (destination && destination !== "/login") {
        navigate(destination, { replace: true })
      } else if (role === "RECRUITER" || role === "ADMIN") {
        navigate("/recruiter/pipeline", { replace: true })
      } else {
        navigate("/candidate/jobs", { replace: true })
      }
    } catch (err: unknown) {
      let detail = "Invalid email or password. Please verify your credentials."
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, any> | undefined
        if (data?.detail) {
          detail = String(data.detail)
        } else if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
          detail = String(data.non_field_errors[0])
        }
      }
      setErrorMessage(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 transition-transform hover:scale-105"
        >
          <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25">
            <BriefcaseBusiness className="size-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-900">
            Smart<span className="text-indigo-600">ATS</span>
          </span>
        </Link>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Access your applicant pipeline and AI resume matching dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-400 cursor-not-allowed">
                  Forgot password?
                </span>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Credentials Autofill Helper */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-3">
              Need a test account?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail("recruiter@technova.com")
                  setPassword("Password123!")
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/70 py-2 px-2 text-center text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Fill Recruiter Demo
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail("candidate@test.com")
                  setPassword("Password123!")
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50/70 py-2 px-2 text-center text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Fill Candidate Demo
              </button>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Don&apos;t have an account yet?{" "}
          <Link
            to="/register"
            className="font-bold text-indigo-600 hover:text-indigo-800"
          >
            Create an account
          </Link>
        </p>

        <p className="mt-2 text-center text-xs text-slate-400">
          <Link to="/" className="hover:underline">
            &larr; Back to Landing Page
          </Link>
        </p>
      </div>
    </div>
  )
}
