import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  FileText,
  Filter,
  Kanban,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Users,
  X,
  Zap,
} from "lucide-react"
import { getCurrentUser, isAuthenticated, logoutUser } from "../lib/auth"

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isAuth = isAuthenticated()
  const user = getCurrentUser()
  const navigate = useNavigate()

  const dashboardPath =
    user?.role === "CANDIDATE" ? "/candidate/jobs" : "/recruiter/pipeline"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="border-b border-indigo-500/10 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 py-2.5 px-4 text-center text-xs font-medium text-indigo-100">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-400/30 mr-2">
          <Sparkles className="size-3 text-indigo-300" /> New
        </span>
        SmartATS 2.0 is live with Semantic Match Scoring and Automated Pipeline Kanban.
        <Link
          to="/register"
          className="ml-2 font-semibold text-white underline underline-offset-4 hover:text-indigo-200"
        >
          Try it free &rarr;
        </Link>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-sm shadow-indigo-500/25 transition-transform group-hover:scale-105">
              <BriefcaseBusiness className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Smart<span className="text-indigo-600">ATS</span>
                </span>
                <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-indigo-700 uppercase">
                  AI Pro
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 -mt-0.5">
                Intelligent Hiring Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              How it Works
            </a>
            <a
              href="#recruiter-experience"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              Recruiter Pipeline
            </a>
            <a
              href="#candidate-discovery"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              Find Jobs
            </a>
          </nav>

          {/* Desktop Right CTA */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuth && user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(dashboardPath)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                >
                  <Kanban className="size-4" /> Go to Workspace
                </button>
                <button
                  onClick={() => logoutUser(navigate)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-200/90 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/20 transition-all hover:bg-indigo-700 hover:shadow-indigo-500/30 active:scale-95"
                >
                  Get Started <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 pt-3 pb-6 md:hidden">
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                How it Works
              </a>
              <a
                href="#recruiter-experience"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                Recruiter Pipeline
              </a>
              <a
                href="#candidate-discovery"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 text-sm font-semibold text-slate-700"
              >
                Find Jobs
              </a>
              <div className="mt-3 flex flex-col gap-2 pt-3 border-t border-slate-100">
                {isAuth && user ? (
                  <>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate(dashboardPath)
                      }}
                      className="w-full rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-bold text-white"
                    >
                      Go to Workspace
                    </button>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        logoutUser(navigate)
                      }}
                      className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-xs font-semibold text-slate-700"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-700"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-bold text-white shadow-sm"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Background Decorative Gradients */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 -translate-x-1/2 transform-gpu blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="aspect-[1155/678] w-[72rem] bg-gradient-to-tr from-indigo-500/20 to-violet-500/25 opacity-70"
          />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Copy & CTAs */}
            <div className="text-center lg:col-span-7 lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-800 shadow-sm mb-6">
                <Sparkles className="size-3.5 text-indigo-600" />
                <span>Next-Gen Semantic Resume Matching Engine</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.12]">
                Hire top talent faster with{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 bg-clip-text text-transparent">
                  AI-powered resume matching
                </span>
              </h1>

              <p className="mt-6 text-base text-slate-600 sm:text-lg max-w-2xl mx-auto lg:mx-0">
                Stop wasting hours on manual resume filtering. SmartATS automatically
                evaluates applicant profiles against job requirements using deep
                semantic alignment, instantly surfacing the top 5% of candidates with
                explainable AI scores.
              </p>

              {/* Prominent CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:shadow-indigo-600/35 active:scale-95 transition-all"
                >
                  Get Started Free <ArrowRight className="size-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition-all"
                >
                  <BriefcaseBusiness className="size-4 text-slate-500" />
                  Recruiter Sign In
                </Link>
              </div>

              {/* Key Trust Signals */}
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-slate-200/80 pt-6 max-w-xl mx-auto lg:mx-0 text-left">
                <div>
                  <p className="text-2xl font-black text-slate-900">94%</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Match Precision
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-indigo-600">65%</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Faster Shortlisting
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">Zero</p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Keyword Blindspots
                  </p>
                </div>
              </div>
            </div>

            {/* Right Mockup Graphic */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow ring */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-violet-500 opacity-20 blur-xl" />

                <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6">
                  {/* Mock card header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm">
                        JD
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Jordan Davies
                        </h4>
                        <p className="text-xs text-slate-500">
                          Senior Full Stack Engineer
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                      92% Match
                    </span>
                  </div>

                  {/* AI Score Breakdown visualization */}
                  <div className="my-5 rounded-xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5 text-indigo-700">
                        <Sparkles className="size-3.5" /> AI Fit Confidence
                      </span>
                      <span>High Alignment</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Semantic Match</span>
                          <span className="font-bold text-slate-800">95%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: "95%" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Skill Overlap</span>
                          <span className="font-bold text-slate-800">88%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-violet-600"
                            style={{ width: "88%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Matched Skills */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Detected Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["Python", "Django", "React", "TypeScript", "PostgreSQL"].map(
                        (skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                          >
                            <Check className="size-3" /> {skill}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Simulated Action */}
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <span className="text-xs text-slate-400">
                      Applied via direct portal
                    </span>
                    <button className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors">
                      Advance to Interview <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Value Proposition & Features Grid */}
      <section id="features" className="border-t border-slate-200 bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Modern Hiring Infrastructure
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Engineered to replace manual resume chaos
            </p>
            <p className="mt-4 text-base text-slate-600">
              SmartATS merges advanced Natural Language Processing with an intuitive
              Kanban pipeline, giving your talent acquisition team superpowers.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
                <BrainCircuit className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Semantic Match Scoring
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Evaluates contextual engineering experience and domain relevance beyond
                simple keyword searches, penalizing resume buzzword stuffing.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-500/20">
                <Kanban className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Kanban Pipeline Management
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Organize candidates into structured stages: Applied, Screening,
                Shortlisted, Interview, and Offered. Advance or reject applicants with a
                single click.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-500/20">
                <Sparkles className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Explainable AI Insights
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Transparent badges highlight exact matched vs. missing requirements,
                giving your hiring managers clear justification for every recommendation.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
                <FileCheck2 className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Multi-Format Document Parsing
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Native parsing for PDF and DOCX files. Automatically extracts contact
                information, education, work tenure, and key technical capabilities.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/20">
                <BarChart3 className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Hiring Velocity Analytics
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Monitor recruitment funnel drop-off, average time-in-stage, and live
                candidate volume across all active company job requisitions.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-7 transition-all hover:-translate-y-1 hover:border-indigo-300 hover:bg-white hover:shadow-lg">
              <div className="grid size-12 place-items-center rounded-xl bg-slate-800 text-white shadow-sm shadow-slate-800/20">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                Role-Based Security
              </h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Enforced JWT authentication with strict role authorization separating
                recruiter administrative tools from public candidate discovery portals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Simple 3-Step Workflow
            </h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              From requisition to offer letter in record time
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <span className="text-4xl font-black text-indigo-100">01</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                Publish Requisitions
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Define the role title, compensation range, department, and required
                technical skills. Roles publish instantly for candidate discovery.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <span className="text-4xl font-black text-indigo-100">02</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                AI Semantic Evaluation
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                When candidates submit resumes, our background pipeline parses documents
                and computes deep match scores with granular skill overlaps.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <span className="text-4xl font-black text-indigo-100">03</span>
              <h3 className="mt-3 text-lg font-bold text-slate-900">
                Review & Advance Pipeline
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Open candidate profile cards on the visual Kanban board. Review
                explainability insights and move top matches forward to interviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role Segmentation Cards */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Recruiter Card */}
            <div
              id="recruiter-experience"
              className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-indigo-50/20 p-8 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">
                  <BriefcaseBusiness className="size-3.5" /> For Hiring Teams
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-900">
                  Automate candidate screening and manage job requisitions
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Post new job requisitions with target skills, review applicant profiles
                  ordered by AI match percentage, and manage your hiring funnel without
                  leaving the unified dashboard.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/register?role=RECRUITER"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  Create Recruiter Account <ChevronRight className="size-4" />
                </Link>
                <Link
                  to="/login"
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900"
                >
                  Sign In &rarr;
                </Link>
              </div>
            </div>

            {/* Candidate Card */}
            <div
              id="candidate-discovery"
              className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800">
                  <Search className="size-3.5" /> For Candidates & Job Seekers
                </div>
                <h3 className="mt-4 text-2xl font-bold text-slate-900">
                  Discover verified opportunities and apply in seconds
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  Browse open positions by salary, location, and technical skill. Upload
                  your resume directly to have your application scored fairly by AI
                  matching algorithms.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <Link
                  to="/register?role=CANDIDATE"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors"
                >
                  Create Candidate Account <ChevronRight className="size-4" />
                </Link>
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-700 hover:text-slate-900"
                >
                  Sign In &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-950 py-16 text-white text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-400/30 mb-6">
            <Zap className="size-3.5 text-indigo-300" /> Enterprise-Ready Resume AI
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Upgrade your hiring pipeline to production standards today
          </h2>
          <p className="mt-4 text-sm sm:text-base text-indigo-200 max-w-2xl mx-auto">
            Join hundreds of forward-thinking recruiters leveraging SmartATS for
            unmatched hiring speed and precision.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-900 shadow-lg hover:bg-indigo-50 transition-all"
            >
              Get Started Now <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-800/40 transition-all"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              <BriefcaseBusiness className="size-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">
                Smart<span className="text-indigo-600">ATS</span>
              </span>
              <p className="text-[11px] text-slate-400">
                AI-Driven Applicant Tracking & Resume Matching
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-slate-800">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-slate-800">
              Register
            </Link>
            <a href="#features" className="hover:text-slate-800">
              Features
            </a>
            <span>&copy; {new Date().getFullYear()} SmartATS Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
