import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FileCheck2,
  Kanban,
  KeyRound,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react"
import { getCurrentUser, isAuthenticated, logoutUser, setAuthSession } from "../lib/auth"
import api from "../lib/api"

export default function Landing(): React.ReactElement {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [instantLoginLoading, setInstantLoginLoading] = useState<boolean>(false)

  const isAuth = isAuthenticated()
  const user = getCurrentUser()
  const navigate = useNavigate()

  const dashboardPath =
    user?.role === "CANDIDATE" ? "/candidate/jobs" : "/recruiter/pipeline"

  const handleCopyCredentials = (text: string, keyName: string): void => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleInstantDemoLogin = async (
    email: string,
    role: "RECRUITER" | "CANDIDATE"
  ): Promise<void> => {
    setInstantLoginLoading(true)
    try {
      const response = await api.post("/auth/login/", {
        email,
        password: "Password123!",
      })
      const data = response.data
      setAuthSession({
        access: data.access,
        refresh: data.refresh,
        user: data.user,
      })
      if (role === "RECRUITER") {
        navigate("/recruiter/pipeline")
      } else {
        navigate("/candidate/jobs")
      }
    } catch {
      // Fallback: navigate to login page with pre-filled state
      navigate("/login", {
        state: { demoEmail: email, demoPassword: "Password123!" },
      })
    } finally {
      setInstantLoginLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* 1. Subtle One-Click Demo Credentials Banner */}
      <aside
        aria-label="Demo credentials banner"
        className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-4 py-2.5 text-xs text-slate-700"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
              <KeyRound className="size-3" /> Quick Demo
            </span>
            <span className="font-semibold text-slate-800">
              Recruiter: <code className="rounded bg-indigo-100/70 px-1.5 py-0.5 text-indigo-950 font-mono">recruiter@technova.com</code> | Password: <code className="rounded bg-indigo-100/70 px-1.5 py-0.5 text-indigo-950 font-mono">Password123!</code>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCopyCredentials(
                  "recruiter@technova.com\nPassword123!",
                  "recruiter"
                )
              }
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Copy className="size-3" />
              {copiedKey === "recruiter" ? "Copied!" : "Copy Creds"}
            </button>

            <button
              type="button"
              disabled={instantLoginLoading}
              onClick={() =>
                handleInstantDemoLogin("recruiter@technova.com", "RECRUITER")
              }
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-60"
            >
              <Sparkles className="size-3" />
              1-Click Recruiter Login
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Glassmorphism Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Branding */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-transform group-hover:scale-105">
              <BriefcaseBusiness className="size-5" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-950">
                Smart<span className="text-indigo-600">ATS</span>
              </span>
              <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                2.0
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
            <a
              href="#features"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              Features
            </a>
            <a
              href="#ai-matching"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              AI Matching
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              How It Works
            </a>
            <Link
              to="/candidate/jobs"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              Candidate Portal
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden items-center gap-4 md:flex">
            {isAuth && user ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(dashboardPath)}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
                >
                  <Kanban className="size-3.5 text-indigo-400" />
                  Workspace
                </button>
                <button
                  type="button"
                  onClick={() => logoutUser(navigate)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors px-2 py-1"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 active:scale-95 transition-all"
                >
                  Get Started Free <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-100 bg-white px-4 pt-3 pb-6 md:hidden">
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                Features
              </a>
              <a
                href="#ai-matching"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                AI Matching
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                How It Works
              </a>
              <Link
                to="/candidate/jobs"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                Candidate Portal
              </Link>
              <div className="mt-2 flex flex-col gap-2 pt-3 border-t border-slate-100">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-bold text-white shadow-sm"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        {/* Soft background ambient gradient */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="aspect-[1155/678] w-[68rem] bg-gradient-to-tr from-indigo-500/15 via-violet-500/20 to-sky-400/15 opacity-80"
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-14 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="text-center lg:col-span-7 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/90 bg-indigo-50/80 px-4 py-1.5 text-xs font-bold text-indigo-900 shadow-xs mb-6">
                <Sparkles className="size-3.5 text-indigo-600" />
                <span>AI-Powered Talent Acquisition Engine</span>
              </div>

              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.1]">
                Hire 10x faster with{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 bg-clip-text text-transparent">
                  AI-powered resume matching
                </span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                SmartATS eliminates manual screening fatigue. Our neural semantic engine
                evaluates resume depth against requisition criteria in real time, delivering
                transparent match scores and an automated visual hiring pipeline.
              </p>

              {/* Dual Interactive Pathways */}
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  type="button"
                  onClick={() =>
                    handleInstantDemoLogin("recruiter@technova.com", "RECRUITER")
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 active:scale-[0.99] transition-all"
                >
                  <BriefcaseBusiness className="size-4" />
                  Post a Role (Recruiter Demo)
                </button>

                <Link
                  to="/candidate/jobs"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-4 text-sm font-bold text-slate-800 shadow-xs hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99] transition-all"
                >
                  <Search className="size-4 text-indigo-600" />
                  Explore Open Jobs (Candidate)
                </Link>
              </div>

              {/* Verified Trust Metrics */}
              <div className="mt-11 grid grid-cols-3 gap-6 border-t border-slate-200/80 pt-7 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <p className="text-3xl font-black text-slate-950">94%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Match Precision
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-indigo-600">65%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Shorter Review Cycles
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-950">50k+</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Resumes Parsed
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Interactive Live AI Match Card */}
            <div id="ai-matching" className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Subtle back illumination glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-500 opacity-20 blur-xl" />

                <div className="relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-900/5">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
                        JD
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-tight">
                          Jordan Davies
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Senior Full Stack Engineer
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 shadow-xs">
                      <Check className="size-3.5" /> 92% Semantic Match
                    </span>
                  </div>

                  {/* Match Evaluation Progress */}
                  <div className="my-5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-3">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <Sparkles className="size-3.5" /> AI Candidate Alignment
                      </span>
                      <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800">
                        Tier 1 Fit
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span className="font-medium">Semantic Match Score</span>
                          <span className="font-bold text-slate-900">95%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                            style={{ width: "95%" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span className="font-medium">Skill Overlap Ratio</span>
                          <span className="font-bold text-slate-900">88%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-600 transition-all duration-700"
                            style={{ width: "88%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Extracted Skill Badges */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Extracted Technical Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Python", "Django", "React", "TypeScript", "PostgreSQL"].map(
                        (skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50/90 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                          >
                            <Check className="size-3 text-emerald-600" /> {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                    <span className="text-slate-400 font-medium">
                      Applied to: TechNova Solutions
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleInstantDemoLogin("recruiter@technova.com", "RECRUITER")
                      }
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      Advance Candidate <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Enterprise Feature Grid */}
      <section id="features" className="border-t border-slate-200/80 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Enterprise Talent Platform
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Engineered for precision hiring at scale
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Empower your talent team with structured pipeline workflows, automated
              resume analysis, and explainable match diagnostics.
            </p>
          </div>

          {/* 3-Column Responsive Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group rounded-2xl border border-slate-200/90 bg-slate-50/40 p-8 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5">
              <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <BrainCircuit className="size-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                Semantic Match Scoring
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Evaluates contextual engineering experience and domain relevance beyond
                simple keyword searches, penalizing buzzword stuffing and highlighting true skill depth.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-2xl border border-slate-200/90 bg-slate-50/40 p-8 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5">
              <div className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/20">
                <Kanban className="size-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                Kanban Pipeline Management
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Organize applicants across 5 standard hiring stages: Applied, Screening,
                Shortlisted, Interview, and Offer. Transition candidates with one-click audit trails.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-2xl border border-slate-200/90 bg-slate-50/40 p-8 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5">
              <div className="grid size-12 place-items-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-600/20">
                <Sparkles className="size-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                Explainable AI Insights
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Clear badges contrast required vs. missing competencies so hiring managers
                and recruiters make confident, justifiable decisions backed by transparent evidence.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-2xl border border-slate-200/90 bg-slate-50/40 p-8 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <FileCheck2 className="size-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                Multi-Format Document Parsing
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Robust parsing for PDF and DOCX resumes with automatic text sanitization,
                skill entity extraction, and vector embedding generation.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group rounded-2xl border border-slate-200/90 bg-slate-50/40 p-8 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5">
              <div className="grid size-12 place-items-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
                <BarChart3 className="size-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                Recruitment Velocity Analytics
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Monitor recruitment funnel drop-off rates, stage durations, and applicant
                volumes across all company job requisitions from a single dashboard.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group rounded-2xl border border-slate-200/90 bg-slate-50/40 p-8 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-950/5">
              <div className="grid size-12 place-items-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/20">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                Role-Based JWT Security
              </h3>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Hardened JWT authentication with automatic refresh token rotation and
                strict route guards separating recruiter pipelines from candidate views.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Workflow */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-[#f8f9fd] border-y border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Streamlined Flow
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              3 steps to automated candidate screening
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
              <span className="text-4xl font-black text-indigo-200">01</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Publish Requisition
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Define the role, compensation parameters, and required technical skills.
                The requisition publishes immediately to candidate discovery.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
              <span className="text-4xl font-black text-indigo-200">02</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                AI Semantic Evaluation
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                As applicants submit PDF/DOCX resumes, SmartATS computes deep semantic
                similarity and skill overlap percentages instantly.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs">
              <span className="text-4xl font-black text-indigo-200">03</span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Pipeline Progression
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Review candidates ranked by match score on the visual Kanban board.
                Advance top matches to interview and offer with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bottom Call to Action */}
      <section className="bg-gradient-to-tr from-slate-950 via-indigo-950 to-slate-900 py-16 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-400/30 mb-5">
            <Zap className="size-3.5" /> Next-Generation ATS
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready to upgrade your talent pipeline?
          </h2>
          <p className="mt-4 text-base text-slate-300 max-w-2xl mx-auto">
            Experience automated AI resume matching, visual candidate pipelines, and
            hiring analytics built to production standards.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() =>
                handleInstantDemoLogin("recruiter@technova.com", "RECRUITER")
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all"
            >
              Launch Recruiter Demo <ArrowRight className="size-4" />
            </button>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-7 py-3.5 text-sm font-bold text-slate-200 hover:bg-slate-800 transition-all"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              <BriefcaseBusiness className="size-4" />
            </div>
            <span className="font-bold text-slate-900 text-sm">
              Smart<span className="text-indigo-600">ATS</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-900">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-900">
              Register
            </Link>
            <Link to="/candidate/jobs" className="hover:text-slate-900">
              Browse Jobs
            </Link>
            <span>&copy; {new Date().getFullYear()} SmartATS Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
