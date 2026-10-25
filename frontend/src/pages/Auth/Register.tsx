import React, { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  User,
} from "lucide-react"
import axios from "axios"
import api from "../../lib/api"
import { setAuthSession } from "../../lib/auth"

export default function Register(): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initialRole =
    searchParams.get("role")?.toUpperCase() === "RECRUITER"
      ? "RECRUITER"
      : "CANDIDATE"

  const [role, setRole] = useState<"CANDIDATE" | "RECRUITER">(initialRole)
  const [firstName, setFirstName] = useState<string>("")
  const [lastName, setLastName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [companyName, setCompanyName] = useState<string>("")
  const [jobTitle, setJobTitle] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setErrorMessage("Please complete all required fields.")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    if (role === "RECRUITER" && !companyName.trim()) {
      setErrorMessage("Please enter your company or organization name.")
      return
    }

    setLoading(true)

    try {
      const payload = {
        email: trimmedEmail,
        password,
        role,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(role === "RECRUITER"
          ? {
              company_name: companyName.trim(),
              title: jobTitle.trim(),
            }
          : {}),
      }

      const response = await api.post("/auth/register/", payload)
      const data = response.data

      // Save session tokens & user object
      setAuthSession({
        access: data.access,
        refresh: data.refresh,
        user: data.user,
      })

      // Redirect to appropriate portal
      if (role === "RECRUITER") {
        navigate("/recruiter/pipeline", { replace: true })
      } else {
        navigate("/candidate/jobs", { replace: true })
      }
    } catch (err: unknown) {
      let message = "Registration failed. Please check your information."
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data as Record<string, any> | undefined
        if (typeof responseData === "string") {
          message = responseData
        } else if (responseData?.email) {
          message = Array.isArray(responseData.email)
            ? String(responseData.email[0])
            : String(responseData.email)
        } else if (responseData?.password) {
          message = Array.isArray(responseData.password)
            ? String(responseData.password[0])
            : String(responseData.password)
        } else if (responseData?.detail) {
          message = String(responseData.detail)
        } else if (Array.isArray(responseData?.non_field_errors)) {
          message = String(responseData.non_field_errors[0])
        }
      }
      setErrorMessage(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
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
          Create your account
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Select your role to configure your AI recruitment workspace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Visual Role Selection Toggle */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Your Account Role <span className="text-rose-500">*</span>
                </label>
                {/* Fallback accessible dropdown */}
                <select
                  aria-label="Select account role"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "CANDIDATE" | "RECRUITER")
                  }
                  className="text-xs text-slate-500 bg-transparent border-0 underline cursor-pointer focus:ring-0"
                >
                  <option value="CANDIDATE">Candidate</option>
                  <option value="RECRUITER">Recruiter</option>
                </select>
              </div>

              {/* Visual Selection Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Candidate Card */}
                <button
                  type="button"
                  onClick={() => setRole("CANDIDATE")}
                  className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    role === "CANDIDATE"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div
                      className={`grid size-9 place-items-center rounded-lg ${
                        role === "CANDIDATE"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <User className="size-4" />
                    </div>
                    {role === "CANDIDATE" && (
                      <span className="grid size-5 place-items-center rounded-full bg-indigo-600 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">Candidate</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                    Looking for roles & submitting resumes
                  </p>
                </button>

                {/* Recruiter Card */}
                <button
                  type="button"
                  onClick={() => setRole("RECRUITER")}
                  className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                    role === "RECRUITER"
                      ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div
                      className={`grid size-9 place-items-center rounded-lg ${
                        role === "RECRUITER"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <BriefcaseBusiness className="size-4" />
                    </div>
                    {role === "RECRUITER" && (
                      <span className="grid size-5 place-items-center rounded-full bg-indigo-600 text-white">
                        <Check className="size-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-900">Recruiter</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                    Hiring team managing job pipelines
                  </p>
                </button>
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="first_name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  placeholder="e.g. Alex"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                />
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  placeholder="e.g. Morgan"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                />
              </div>
            </div>

            {/* Recruiter-specific fields */}
            {role === "RECRUITER" && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5">
                <div>
                  <label
                    htmlFor="company_name"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Company Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
                    <input
                      id="company_name"
                      type="text"
                      required={role === "RECRUITER"}
                      placeholder="e.g. TechNova"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="job_title"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Your Job Title
                  </label>
                  <input
                    id="job_title"
                    type="text"
                    placeholder="e.g. Talent Lead"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={
                    role === "RECRUITER" ? "recruiter@company.com" : "alex@example.com"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
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

              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-slate-400" />
                  <input
                    id="confirm_password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                  />
                </div>
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
                    Creating account...
                  </>
                ) : (
                  <>
                    Complete Registration <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Navigation */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-bold text-indigo-600 hover:text-indigo-800"
          >
            Sign in here
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
