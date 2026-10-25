import React, { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Kanban,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react"
import axios from "axios"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "../components/ui/primitives"
import NotificationBell from "../components/NotificationBell"
import {
  Application,
  ApplicationStatus,
  useApplications,
  useTransitionApplication,
} from "../hooks/useApplications"
import { getCurrentUser, logoutUser } from "../lib/auth"

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; badgeClass: string; desc: string }
> = {
  APPLIED: {
    label: "Applied",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    desc: "Your application has been received and queued for review.",
  },
  SCREENING: {
    label: "In Screening",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    desc: "Hiring team is evaluating your resume and technical profile.",
  },
  SHORTLISTED: {
    label: "Shortlisted",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    desc: "Great news! You have been shortlisted for recruiter outreach.",
  },
  INTERVIEW_SCHEDULED: {
    label: "Interview Scheduled",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    desc: "An interview has been scheduled. Check your email for details.",
  },
  OFFERED: {
    label: "Offer Extended",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    desc: "Congratulations! An employment offer has been extended.",
  },
  REJECTED: {
    label: "Not Selected",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    desc: "The team has decided to move forward with other candidates.",
  },
  WITHDRAWN: {
    label: "Withdrawn",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    desc: "You withdrew your application for this requisition.",
  },
}

function formatDate(dateString?: string): string {
  if (!dateString) return "Recently"
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

function getScoreBadgeColor(score: number): {
  bg: string
  text: string
  ring: string
} {
  if (score >= 85) {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-600/20",
    }
  }
  if (score >= 70) {
    return {
      bg: "bg-indigo-50",
      text: "text-indigo-700",
      ring: "ring-indigo-600/20",
    }
  }
  if (score >= 50) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-600/20",
    }
  }
  return {
    bg: "bg-slate-50",
    text: "text-slate-700",
    ring: "ring-slate-600/20",
  }
}

export default function CandidateApplications(): React.ReactElement {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  // State
  const [search, setSearch] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Withdrawal Modal State
  const [appToWithdraw, setAppToWithdraw] = useState<Application | null>(null)
  const [withdrawReason, setWithdrawReason] = useState<string>("")

  // Queries & Mutations
  const {
    data: applications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useApplications()

  const transitionMutation = useTransitionApplication()

  const isRecruiter =
    currentUser?.role === "RECRUITER" || currentUser?.role === "ADMIN"

  const userInitials = useMemo(() => {
    if (!currentUser?.email) return "CD"
    const part = currentUser.email.split("@")[0].replace(/[^a-zA-Z]/g, "")
    return (part.slice(0, 2) || "CD").toUpperCase()
  }, [currentUser?.email])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = applications.length
    const inReview = applications.filter((a) =>
      ["APPLIED", "SCREENING", "SHORTLISTED"].includes(a.status)
    ).length
    const interviewing = applications.filter(
      (a) => a.status === "INTERVIEW_SCHEDULED"
    ).length
    const offers = applications.filter((a) => a.status === "OFFERED").length
    return { total, inReview, interviewing, offers }
  }, [applications])

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Search
      const searchLower = search.toLowerCase().trim()
      const matchesSearch =
        !searchLower ||
        app.job?.title?.toLowerCase().includes(searchLower) ||
        app.job?.company?.name?.toLowerCase().includes(searchLower) ||
        app.job?.location?.toLowerCase().includes(searchLower)

      // Status
      let matchesStatus = true
      if (statusFilter === "active") {
        matchesStatus = [
          "APPLIED",
          "SCREENING",
          "SHORTLISTED",
          "INTERVIEW_SCHEDULED",
        ].includes(app.status)
      } else if (statusFilter === "interviews") {
        matchesStatus = app.status === "INTERVIEW_SCHEDULED"
      } else if (statusFilter === "offers") {
        matchesStatus = app.status === "OFFERED"
      } else if (statusFilter === "closed") {
        matchesStatus = ["REJECTED", "WITHDRAWN"].includes(app.status)
      } else if (statusFilter !== "all") {
        matchesStatus = app.status === statusFilter
      }

      return matchesSearch && matchesStatus
    })
  }, [applications, search, statusFilter])

  // Handle application withdrawal
  const handleConfirmWithdraw = async () => {
    if (!appToWithdraw) return
    try {
      await transitionMutation.mutateAsync({
        applicationId: appToWithdraw.id,
        targetStage: "WITHDRAWN",
        notes: withdrawReason || "Withdrawn by candidate.",
      })
      setToastNotice(
        `Application for "${appToWithdraw.job?.title}" has been withdrawn.`
      )
      setAppToWithdraw(null)
      setWithdrawReason("")
    } catch (err: unknown) {
      let msg = "Failed to withdraw application."
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, unknown> | undefined
        if (typeof data?.detail === "string") {
          msg = data.detail
        }
      }
      setErrorMessage(msg)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans">
      {/* ===================== NAVBAR ===================== */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-md sm:px-8 lg:px-10">
        <div className="flex items-center gap-8">
          <div
            onClick={() => navigate("/candidate/jobs")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
              <BriefcaseBusiness className="size-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight">
                Smart<span className="text-indigo-600">ATS</span>
              </span>
              <span className="ml-2 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                Candidate Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/candidate/jobs")}
              className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
            >
              Browse Jobs
            </button>
            <button
              type="button"
              onClick={() => navigate("/candidate/applications")}
              className="rounded-lg bg-indigo-50/90 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition-colors"
            >
              My Applications
            </button>
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          {isRecruiter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/recruiter/pipeline")}
              className="hidden sm:inline-flex text-xs gap-1.5 border-slate-200"
            >
              <Kanban className="size-3.5 text-indigo-600" /> Recruiter Pipeline
            </Button>
          )}

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full p-1.5 hover:bg-slate-100/70 transition-colors"
              >
                <div className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                  {userInitials}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                    {currentUser?.email?.split("@")[0] || "Candidate"}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize">
                    {currentUser?.role?.toLowerCase() || "Candidate"}
                  </p>
                </div>
                <ChevronRight className="hidden size-4 rotate-90 text-slate-400 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.email || "candidate@test.com"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Role: {currentUser?.role || "CANDIDATE"}
                </p>
              </div>
              <DropdownMenuItem
                onClick={() => navigate("/candidate/jobs")}
                className="cursor-pointer text-xs"
              >
                <BriefcaseBusiness className="mr-2 size-3.5 text-slate-500" />
                Browse Jobs
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/candidate/applications")}
                className="cursor-pointer text-xs font-semibold text-indigo-600"
              >
                <FileText className="mr-2 size-3.5 text-indigo-600" />
                My Applications
              </DropdownMenuItem>
              {isRecruiter && (
                <DropdownMenuItem
                  onClick={() => navigate("/recruiter/pipeline")}
                  className="cursor-pointer text-xs"
                >
                  <Kanban className="mr-2 size-3.5 text-slate-500" />
                  Recruiter Pipeline
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => logoutUser(navigate)}
                className="text-rose-600 focus:text-rose-700 font-semibold cursor-pointer text-xs border-t border-slate-100 mt-1"
              >
                <LogOut className="mr-2 size-3.5" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Toast Alert */}
      {toastNotice && (
        <div className="mx-5 mt-5 sm:mx-8 lg:mx-10">
          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Check className="size-4 shrink-0 text-indigo-600" />
              <span>{toastNotice}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss toast"
              onClick={() => setToastNotice(null)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mx-5 mt-5 sm:mx-8 lg:mx-10">
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-[1450px] w-full px-5 py-8 sm:px-8 lg:px-10 flex-1">
        {/* Header Section */}
        <section className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Candidate Portal</span>
              <ChevronRight className="size-3" />
              <span className="text-indigo-600 font-semibold">
                My Applications
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Track Your Applications
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time hiring status, automated AI resume match scores, and
              application lifecycle updates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${
                  isLoading || isRefetching ? "animate-spin text-indigo-600" : ""
                }`}
              />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/candidate/jobs")}
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <BriefcaseBusiness className="size-3.5" />
              Explore Open Roles
            </Button>
          </div>
        </section>

        {/* Quick KPI Metric Cards */}
        <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">
              Total Applications
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900">
                {metrics.total}
              </span>
              <span className="text-[11px] text-slate-400">submitted</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">In Review</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-indigo-600">
                {metrics.inReview}
              </span>
              <span className="text-[11px] text-slate-400">
                screening / shortlisted
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">
              Interviews Scheduled
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-amber-600">
                {metrics.interviewing}
              </span>
              <span className="text-[11px] text-slate-400">active rounds</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <p className="text-xs font-semibold text-slate-500">
              Offers Extended
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600">
                {metrics.offers}
              </span>
              <span className="text-[11px] text-slate-400">action required</span>
            </div>
          </div>
        </section>

        {/* Search & Status Filters */}
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs md:flex-row md:items-center md:justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { key: "all", label: "All", count: metrics.total },
              { key: "active", label: "Active", count: metrics.inReview + metrics.interviewing },
              { key: "interviews", label: "Interviews", count: metrics.interviewing },
              { key: "offers", label: "Offers", count: metrics.offers },
              {
                key: "closed",
                label: "Closed",
                count: applications.filter((a) =>
                  ["REJECTED", "WITHDRAWN"].includes(a.status)
                ).length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === tab.key
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    statusFilter === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-slate-200/80 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <Input
              placeholder="Filter by job or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </section>

        {/* Applications List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-xs">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-semibold text-slate-600">
              Loading your submitted applications...
            </p>
          </div>
        ) : filteredApplications.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-xs">
            <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs">
              <BriefcaseBusiness className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              {applications.length === 0
                ? "No applications submitted yet"
                : "No applications match your filter"}
            </h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">
              {applications.length === 0
                ? "Explore open engineering, AI, and infrastructure roles. Apply in one click and our AI will score your resume match instantly."
                : "Try clearing your search terms or selecting a different status filter tab to view your applications."}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {applications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setStatusFilter("all")
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => navigate("/candidate/jobs")}
                className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Browse Open Roles
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          /* Cards Grid */
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const statusCfg =
                STATUS_CONFIG[app.status] || STATUS_CONFIG.APPLIED
              const isWithdrawable = ![
                "WITHDRAWN",
                "REJECTED",
                "HIRED",
              ].includes(app.status)

              const matchScoreNum = app.match_score?.overall_score
                ? Number(app.match_score.overall_score)
                : null
              const scoreColor = matchScoreNum !== null
                ? getScoreBadgeColor(matchScoreNum)
                : null

              const matchedSkills = app.match_score?.matched_skills || []
              const missingSkills = app.match_score?.missing_skills || []

              return (
                <div
                  key={app.id}
                  className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3.5">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200/60">
                        <Building2 className="size-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900">
                            {app.job?.title || "Requisition"}
                          </h2>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${statusCfg.badgeClass}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {app.job?.company?.name || "Company"}
                          </span>
                          {app.job?.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3 text-slate-400" />
                              {app.job.location}
                            </span>
                          )}
                          {app.job?.department && (
                            <span>{app.job.department}</span>
                          )}
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Calendar className="size-3" />
                            Applied {formatDate(app.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu / Button */}
                    <div className="flex items-center gap-2 self-end sm:self-start">
                      {isWithdrawable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAppToWithdraw(app)}
                          className="text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Stage Description Notice */}
                  <p className="mt-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Status update:
                    </span>{" "}
                    {statusCfg.desc}
                  </p>

                  {/* AI Match Breakdown Box */}
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">
                          AI Resume Match Breakdown
                        </span>
                      </div>

                      {matchScoreNum !== null && scoreColor ? (
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${scoreColor.bg} ${scoreColor.text} ${scoreColor.ring}`}
                        >
                          <span>{matchScoreNum.toFixed(0)}% Overall Match</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          AI scoring in progress...
                        </span>
                      )}
                    </div>

                    {/* Skills Breakdown */}
                    {(matchedSkills.length > 0 || missingSkills.length > 0) && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {/* Matched Skills */}
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1 mb-1.5">
                            <Check className="size-3 text-emerald-600" />
                            Matched Skills ({matchedSkills.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {matchedSkills.length > 0 ? (
                              matchedSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60"
                                >
                                  {sk}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                None detected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Missing Skills */}
                        <div>
                          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 mb-1.5">
                            <AlertCircle className="size-3 text-amber-600" />
                            Target Skills to Learn ({missingSkills.length})
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {missingSkills.length > 0 ? (
                              missingSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60"
                                >
                                  {sk}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                None! You meet all listed requirements.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resume Attachment Info */}
                    {app.resume && (
                      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-500">
                        <FileText className="size-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          Submitted Resume:
                        </span>
                        <span className="text-slate-600 truncate max-w-xs">
                          {app.resume.original_filename}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ===================== WITHDRAW CONFIRMATION MODAL ===================== */}
      <Dialog
        open={Boolean(appToWithdraw)}
        onOpenChange={(open) => {
          if (!open) {
            setAppToWithdraw(null)
            setWithdrawReason("")
          }
        }}
      >
        <DialogContent className="max-w-md">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="grid size-10 place-items-center rounded-xl bg-rose-100">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Withdraw Application
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Confirm candidate withdrawal from this hiring pipeline.
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-xs leading-relaxed text-slate-600">
              Are you sure you want to withdraw your application for{" "}
              <span className="font-bold text-slate-900">
                {appToWithdraw?.job?.title}
              </span>{" "}
              at{" "}
              <span className="font-bold text-slate-900">
                {appToWithdraw?.job?.company?.name || "the hiring company"}
              </span>
              ?
            </p>
            <p className="text-[11px] text-slate-500">
              This action cannot be undone. You will need to submit a new
              application if you wish to be considered again.
            </p>

            <div className="pt-2">
              <label
                htmlFor="withdraw-reason"
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Optional reason for withdrawing:
              </label>
              <Input
                id="withdraw-reason"
                placeholder="e.g., Accepted another offer, personal reasons..."
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={transitionMutation.isPending}
              onClick={() => {
                setAppToWithdraw(null)
                setWithdrawReason("")
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={transitionMutation.isPending}
              onClick={handleConfirmWithdraw}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              {transitionMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              Confirm Withdrawal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
