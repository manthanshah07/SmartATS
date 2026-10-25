import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CircleUserRound,
  ExternalLink,
  FileText,
  Filter,
  Kanban,
  Loader2,
  MapPin,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  UploadCloud,
  Users,
  X,
} from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/primitives"
import {
  Application,
  ApplicationStatus,
  useApplications,
  useUpdateApplicationStatus,
} from "./hooks/useApplications"
import {
  formatJobType,
  formatSalary,
  Job,
  useApplyToJob,
  useJobs,
} from "./hooks/useJobs"

const AVATAR_COLORS = [
  "bg-indigo-600",
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-cyan-700",
  "bg-slate-900",
  "bg-rose-600",
]

function getAvatarColor(identifier?: string): string {
  if (!identifier) return "bg-indigo-600"
  let hash = 0
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function getInitials(text?: string): string {
  if (!text) return "JD"
  const clean = text.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim()
  const parts = clean.split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return text.slice(0, 2).toUpperCase()
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Recently"
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks}w ago`
}

function scoreTone(score: number | string | undefined | null): string {
  if (score === undefined || score === null) {
    return "border-slate-200 bg-slate-50 text-slate-500"
  }
  const val = Number(score)
  if (val >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (val >= 60) return "border-indigo-200 bg-indigo-50 text-indigo-700"
  return "border-amber-200 bg-amber-50 text-amber-700"
}

const KANBAN_COLUMNS: {
  id: ApplicationStatus
  title: string
  tone: string
}[] = [
  { id: "APPLIED", title: "Applied", tone: "bg-indigo-500" },
  { id: "SCREENING", title: "Screening", tone: "bg-violet-500" },
  { id: "SHORTLISTED", title: "Shortlisted", tone: "bg-sky-500" },
  { id: "INTERVIEW_SCHEDULED", title: "Interview", tone: "bg-amber-400" },
  { id: "OFFERED", title: "Offered", tone: "bg-emerald-500" },
]

const NEXT_STATUS: Record<ApplicationStatus, ApplicationStatus | null> = {
  APPLIED: "SCREENING",
  SCREENING: "SHORTLISTED",
  SHORTLISTED: "INTERVIEW_SCHEDULED",
  INTERVIEW_SCHEDULED: "OFFERED",
  OFFERED: null,
  REJECTED: null,
  WITHDRAWN: null,
}

const NEXT_STATUS_LABEL: Record<ApplicationStatus, string | null> = {
  APPLIED: "Move to Screening",
  SCREENING: "Shortlist Candidate",
  SHORTLISTED: "Schedule Interview",
  INTERVIEW_SCHEDULED: "Extend Offer",
  OFFERED: "Hired",
  REJECTED: null,
  WITHDRAWN: null,
}

function App() {
  const [activeTab, setActiveTab] = useState<"kanban" | "candidate" | "analytics">(
    "kanban"
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Kanban Filter & Selection State
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(
    null
  )

  // Candidate Job Discovery State
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("all")
  const [minSalary, setMinSalary] = useState<string>("all")
  const [selectedJobToApply, setSelectedJobToApply] = useState<Job | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState("")
  const [applyError, setApplyError] = useState<string | null>(null)
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  // Live Query Hooks
  const {
    data: applications = [],
    isLoading: isLoadingApps,
    isError: isErrorApps,
    error: errorApps,
    refetch: refetchApps,
  } = useApplications({
    job_id: selectedJobFilter !== "all" ? selectedJobFilter : undefined,
  })

  const updateStatusMutation = useUpdateApplicationStatus()

  const {
    data: jobs = [],
    isLoading: isLoadingJobs,
    isError: isErrorJobs,
    error: errorJobs,
    refetch: refetchJobs,
  } = useJobs({
    search,
    location,
    job_type: jobType,
    salary_min: minSalary !== "all" ? minSalary : undefined,
    is_active: true,
  })

  const applyMutation = useApplyToJob()

  // Partition applications by status for Kanban columns
  const applicationsByStatus = useMemo(() => {
    const map: Record<ApplicationStatus, Application[]> = {
      APPLIED: [],
      SCREENING: [],
      SHORTLISTED: [],
      INTERVIEW_SCHEDULED: [],
      OFFERED: [],
      REJECTED: [],
      WITHDRAWN: [],
    }
    applications.forEach((app) => {
      if (map[app.status]) {
        map[app.status].push(app)
      }
    })
    return map
  }, [applications])

  // Average match score across pipeline
  const averageMatchScore = useMemo(() => {
    const scores = applications
      .map((a) => (a.match_score?.overall_score ? Number(a.match_score.overall_score) : null))
      .filter((s): s is number => s !== null)
    if (!scores.length) return "78%"
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    return `${avg}%`
  }, [applications])

  // Handle status update
  const handleStatusTransition = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        applicationId,
        newStatus,
      })
      setToastNotice(`Application moved to ${newStatus} successfully.`)
      // If modal is open for this application, update local state
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev) =>
          prev ? { ...prev, status: newStatus } : null
        )
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.status?.[0] ||
        "Failed to update application status."
      setToastNotice(`Error: ${msg}`)
    }
  }

  // Handle Candidate Apply
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setApplyError(null)
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setApplyError("Resume file size must be less than 5MB.")
        return
      }
      setResumeFile(file)
    }
  }

  const handleApplySubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedJobToApply) return
    if (!resumeFile) {
      setApplyError("Please select a PDF or DOCX resume to upload.")
      return
    }

    setApplyError(null)
    try {
      await applyMutation.mutateAsync({
        jobId: selectedJobToApply.id,
        file: resumeFile,
        coverLetter: coverLetter.trim() || undefined,
      })

      setToastNotice(
        `Application for "${selectedJobToApply.title}" at ${selectedJobToApply.company.name} submitted successfully! AI matching is now analyzing your profile.`
      )
      setResumeFile(null)
      setCoverLetter("")
      setSelectedJobToApply(null)
    } catch (err: any) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.file?.[0] ||
        "Failed to submit application. Please verify your file and try again."
      setApplyError(String(detail))
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* Sidebar Navigation */}
      <aside
        className={`${
          sidebarOpen ? "w-[248px]" : "w-[78px]"
        } fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white transition-all lg:flex lg:flex-col`}
      >
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <BriefcaseBusiness className="size-5" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold tracking-tight">
              Smart<span className="text-indigo-600">ATS</span>
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
            <button
              onClick={() => setActiveTab("kanban")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "kanban"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Kanban className="size-5 shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">Pipeline Kanban</span>
                  {applications.length > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700 font-bold">
                      {applications.length}
                    </span>
                  )}
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab("candidate")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "candidate"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Search className="size-5 shrink-0" />
              {sidebarOpen && <span className="flex-1 text-left">Find Jobs</span>}
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "analytics"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="size-5 shrink-0" />
              {sidebarOpen && <span className="flex-1 text-left">Analytics</span>}
            </button>
          </nav>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              aria-label="Toggle sidebar"
            >
              <Menu className="size-5 shrink-0" />
              {sidebarOpen && <span>Collapse sidebar</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div
        className={`${
          sidebarOpen ? "lg:pl-[248px]" : "lg:pl-[78px]"
        } min-h-screen transition-all`}
      >
        {/* Top Navbar */}
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
              <BriefcaseBusiness className="size-4" />
            </div>
            <span className="font-bold">
              Smart<span className="text-indigo-600">ATS</span>
            </span>
          </div>

          <div className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              {activeTab === "kanban"
                ? "Recruiter Workspace"
                : activeTab === "candidate"
                ? "Candidate Portal"
                : "Recruiter Analytics"}
            </p>
            <h1 className="mt-0.5 text-lg font-bold">
              {activeTab === "kanban"
                ? "Applicant Pipeline & AI Matching"
                : activeTab === "candidate"
                ? "Explore Open Opportunities"
                : "Hiring Performance Metrics"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5 text-slate-500" />
              <span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1.5 hover:bg-slate-50">
                  <div className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    JD
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold">Jordan Davis</p>
                    <p className="text-[11px] text-slate-400">Recruiter</p>
                  </div>
                  <ChevronRight className="hidden size-4 rotate-90 text-slate-400 sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Recruiter Profile</DropdownMenuItem>
                <DropdownMenuItem>Manage Postings</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Global Toast Alert */}
        {toastNotice && (
          <div className="mx-5 mt-5 sm:mx-8 lg:mx-10">
            <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-900 shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="size-5 shrink-0 text-indigo-600" />
                <span>{toastNotice}</span>
              </div>
              <button
                aria-label="Dismiss toast"
                onClick={() => setToastNotice(null)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ===================== TAB 1: KANBAN PIPELINE ===================== */}
        {activeTab === "kanban" && (
          <main className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10">
            {/* Header and Filter Controls */}
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>Workspace</span>
                  <ChevronRight className="size-3" />
                  <span className="text-indigo-600 font-semibold">Pipelines</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">
                  Applicant Pipeline
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review AI-scored candidate profiles and advance applicants through stages.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Filter by Job */}
                <div className="w-56">
                  <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="All job requisitions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Requisitions ({jobs.length})</SelectItem>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchApps()}
                  className="gap-2 text-xs"
                >
                  <RefreshCw
                    className={`size-3.5 ${isLoadingApps ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Metrics Bar */}
            <div className="mb-7 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Applicants</p>
                  <p className="mt-0.5 text-xl font-bold">{applications.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Average Match Score</p>
                  <p className="mt-0.5 text-xl font-bold">{averageMatchScore}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BriefcaseBusiness className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Active Jobs</p>
                  <p className="mt-0.5 text-xl font-bold">{jobs.length}</p>
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {isLoadingApps && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Loading applicant pipeline...
                </p>
              </div>
            )}

            {/* Error Message */}
            {!isLoadingApps && isErrorApps && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-sm mb-6">
                <AlertCircle className="mx-auto size-7 text-rose-500" />
                <p className="mt-2 text-sm font-bold text-rose-900">
                  Failed to load applications
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  {(errorApps as Error)?.message || "Check your backend connection."}
                </p>
              </div>
            )}

            {/* Kanban Horizontal Board */}
            {!isLoadingApps && !isErrorApps && (
              <section className="overflow-x-auto pb-6">
                <div className="flex min-w-[1180px] gap-4">
                  {KANBAN_COLUMNS.map((column) => {
                    const columnApps = applicationsByStatus[column.id] || []
                    return (
                      <div key={column.id} className="w-[225px] shrink-0 xl:flex-1">
                        {/* Column Header */}
                        <div className="mb-3.5 flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className={`size-2.5 rounded-full ${column.tone}`} />
                            <h3 className="text-sm font-bold text-slate-900">
                              {column.title}
                            </h3>
                            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {columnApps.length}
                            </span>
                          </div>
                        </div>

                        {/* Cards Column */}
                        <div className="flex flex-col gap-3 min-h-[350px] rounded-2xl bg-slate-100/60 p-2.5 border border-slate-200/60">
                          {columnApps.length === 0 ? (
                            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
                              No candidates
                            </div>
                          ) : (
                            columnApps.map((app) => {
                              const scoreVal = app.match_score?.overall_score
                                ? Math.round(Number(app.match_score.overall_score))
                                : null
                              const nextStatus = NEXT_STATUS[app.status]
                              const nextLabel = NEXT_STATUS_LABEL[app.status]

                              return (
                                <div
                                  key={app.id}
                                  className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md cursor-pointer"
                                  onClick={() => setSelectedApplication(app)}
                                >
                                  {/* Card Top: Initials & Score */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div
                                      className={`grid size-8 place-items-center rounded-full text-xs font-bold text-white shadow-sm ${getAvatarColor(
                                        app.candidate_email
                                      )}`}
                                    >
                                      {getInitials(app.candidate_email)}
                                    </div>

                                    {scoreVal !== null ? (
                                      <span
                                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${scoreTone(
                                          scoreVal
                                        )}`}
                                      >
                                        {scoreVal}% match
                                      </span>
                                    ) : (
                                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">
                                        Evaluating...
                                      </span>
                                    )}
                                  </div>

                                  {/* Candidate Info */}
                                  <div className="mt-2.5">
                                    <h4 className="truncate text-xs font-bold text-slate-900">
                                      {app.candidate_email.split("@")[0]}
                                    </h4>
                                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                      {app.job.title}
                                    </p>
                                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                      <CalendarDays className="size-3" />
                                      {formatRelativeTime(app.created_at)}
                                    </p>
                                  </div>

                                  {/* Skills Chips */}
                                  <div className="mt-2.5 flex flex-wrap gap-1">
                                    {app.match_score?.matched_skills &&
                                    app.match_score.matched_skills.length > 0 ? (
                                      app.match_score.matched_skills
                                        .slice(0, 2)
                                        .map((s) => (
                                          <Badge
                                            key={s}
                                            variant="outline"
                                            className="px-1.5 py-0.5 text-[9px] border-emerald-200 bg-emerald-50 text-emerald-700"
                                          >
                                            {s}
                                          </Badge>
                                        ))
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="px-1.5 py-0.5 text-[9px] text-slate-400"
                                      >
                                        AI Match
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Card Bottom: Actions */}
                                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold">
                                    <span className="flex items-center gap-1 text-indigo-600">
                                      <Sparkles className="size-3" />
                                      AI Insights
                                    </span>

                                    {nextStatus && (
                                      <button
                                        type="button"
                                        title={nextLabel || "Advance"}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleStatusTransition(app.id, nextStatus)
                                        }}
                                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 p-1"
                                      >
                                        <ArrowRight className="size-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}
          </main>
        )}

        {/* ===================== TAB 2: CANDIDATE JOB DISCOVERY ===================== */}
        {activeTab === "candidate" && (
          <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
            <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>Workspace</span>
                  <ChevronRight className="size-3" />
                  <span className="text-indigo-600 font-semibold">Find Jobs</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">
                  Explore open roles
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Discover AI-matched positions and submit your resume directly to hiring teams.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchJobs()}
                  className="gap-2 text-xs"
                >
                  <RefreshCw
                    className={`size-3.5 ${isLoadingJobs ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </section>

            {/* Filter Bar */}
            <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1.2fr_1fr]">
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
                  <Input
                    placeholder="Search job titles, skills, or companies"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Job Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All job types</SelectItem>
                    <SelectItem value="FULL_TIME">Full-time</SelectItem>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="PART_TIME">Part-time</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
                  <Input
                    placeholder="Location (e.g. San Francisco, Remote)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                <Select value={minSalary} onValueChange={setMinSalary}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Min. Salary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Salary</SelectItem>
                    <SelectItem value="60000">$60k+ / year</SelectItem>
                    <SelectItem value="90000">$90k+ / year</SelectItem>
                    <SelectItem value="120000">$120k+ / year</SelectItem>
                    <SelectItem value="150000">$150k+ / year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                <span className="text-indigo-600 font-bold">{jobs.length}</span>{" "}
                {jobs.length === 1 ? "role" : "roles"} matching your criteria
              </p>
            </div>

            {/* Loading / Cards */}
            {isLoadingJobs ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Fetching active job requisitions...
                </p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
                <Search className="mx-auto mb-3 size-8 text-slate-300" />
                <p className="font-semibold text-slate-800">No matching jobs found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try broadening your search criteria.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="group flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`grid size-11 place-items-center rounded-xl text-base font-bold text-white shadow-sm ${getAvatarColor(
                          job.company?.name
                        )}`}
                      >
                        {job.company?.name
                          ? job.company.name.charAt(0).toUpperCase()
                          : "C"}
                      </div>
                      <Badge variant="outline" className="text-slate-500 font-normal">
                        {formatRelativeTime(job.created_at)}
                      </Badge>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-[17px] font-bold tracking-tight text-slate-900 line-clamp-1">
                        {job.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                        {job.company?.name || "Company"}
                        {job.company?.is_verified && (
                          <span
                            title="Verified Company"
                            className="inline-flex size-4 items-center justify-center rounded-full bg-indigo-600 text-white"
                          >
                            <Check className="size-2.5" />
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{job.location || "Remote"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <CircleDollarSign className="size-3.5 text-slate-400 shrink-0" />
                        <span>
                          {formatSalary(job.salary_min, job.salary_max)} ·{" "}
                          {formatJobType(job.job_type)}
                        </span>
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-5 border-t border-slate-50">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {job.skills && job.skills.length > 0 ? (
                          job.skills.slice(0, 3).map((skill) => (
                            <Badge
                              key={skill.id}
                              variant={skill.is_required ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {skill.skill_name}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {job.department || "Full-time"}
                          </Badge>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedJobToApply(job)
                          setResumeFile(null)
                          setCoverLetter("")
                          setApplyError(null)
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        Apply <ChevronRight className="size-3.5 ml-1" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        )}

        {/* ===================== TAB 3: RECRUITER ANALYTICS ===================== */}
        {activeTab === "analytics" && (
          <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
            <h2 className="text-2xl font-bold tracking-tight mb-6">
              Recruiter Analytics & Performance
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Active Job Postings</p>
                <p className="mt-1 text-2xl font-bold">{jobs.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Applicants</p>
                <p className="mt-1 text-2xl font-bold">{applications.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Avg. Match Score</p>
                <p className="mt-1 text-2xl font-bold">{averageMatchScore}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Interviews Scheduled</p>
                <p className="mt-1 text-2xl font-bold">
                  {applicationsByStatus.INTERVIEW_SCHEDULED.length}
                </p>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* ===================== AI EXPLAINABILITY MODAL ===================== */}
      <Dialog
        open={!!selectedApplication}
        onOpenChange={(open) => !open && setSelectedApplication(null)}
      >
        <DialogContent className="max-w-[560px]">
          {selectedApplication && (
            <>
              {/* Header */}
              <div className="mb-4 flex items-start justify-between pr-6">
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
                    <Sparkles className="size-3.5" /> AI Explainability & Insights
                  </div>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {selectedApplication.candidate_email}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-slate-500">
                    {selectedApplication.job.title} ·{" "}
                    {formatRelativeTime(selectedApplication.created_at)}
                  </DialogDescription>
                </div>

                <div
                  className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${scoreTone(
                    selectedApplication.match_score?.overall_score
                  )}`}
                >
                  {selectedApplication.match_score?.overall_score
                    ? `${Math.round(
                        Number(selectedApplication.match_score.overall_score)
                      )}% match`
                    : "Score Pending"}
                </div>
              </div>

              {/* Conic Gradient Overall Score Visualization */}
              <div className="flex flex-col items-center rounded-2xl bg-slate-50 py-6 border border-slate-100">
                {(() => {
                  const score = selectedApplication.match_score?.overall_score
                    ? Math.round(Number(selectedApplication.match_score.overall_score))
                    : 0
                  return (
                    <>
                      <div
                        className="grid size-32 place-items-center rounded-full shadow-inner"
                        style={{
                          background: `conic-gradient(#6366f1 ${score}%, #e2e8f0 0)`,
                        }}
                      >
                        <div className="grid size-[104px] place-items-center rounded-full bg-white shadow-sm">
                          <div className="text-center">
                            <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                              {score}%
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              Overall Score
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-xs font-semibold text-slate-700">
                        {score >= 80
                          ? "High match candidate for this requisition"
                          : score >= 60
                          ? "Solid candidate alignment with transferable skills"
                          : "Moderate overlap; review missing skill requirements"}
                      </p>

                      {/* Sub-scores */}
                      <div className="mt-3 flex items-center gap-6 text-[11px] text-slate-500">
                        <span>
                          Semantic Score:{" "}
                          <strong className="text-slate-800">
                            {selectedApplication.match_score?.semantic_score
                              ? `${Math.round(
                                  Number(selectedApplication.match_score.semantic_score)
                                )}%`
                              : "N/A"}
                          </strong>
                        </span>
                        <span>
                          Skill Overlap:{" "}
                          <strong className="text-slate-800">
                            {selectedApplication.match_score?.skill_overlap_score
                              ? `${Math.round(
                                  Number(
                                    selectedApplication.match_score.skill_overlap_score
                                  )
                                )}%`
                              : "N/A"}
                          </strong>
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Matched & Missing Skills Lists */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Matched Skills (Green Badges) */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Matched Skills (
                    {selectedApplication.match_score?.matched_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApplication.match_score?.matched_skills &&
                    selectedApplication.match_score.matched_skills.length > 0 ? (
                      selectedApplication.match_score.matched_skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium"
                        >
                          <Check className="mr-1 size-3" />
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">
                        No matched skills identified
                      </span>
                    )}
                  </div>
                </div>

                {/* Missing Skills (Red Badges) */}
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Missing Skills (
                    {selectedApplication.match_score?.missing_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApplication.match_score?.missing_skills &&
                    selectedApplication.match_score.missing_skills.length > 0 ? (
                      selectedApplication.match_score.missing_skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="border-rose-200 bg-rose-50 text-rose-700 text-xs font-medium"
                        >
                          <X className="mr-1 size-3" />
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">
                        All required skills present
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resume File Link */}
              {selectedApplication.resume?.file && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 truncate">
                    <FileText className="size-4 shrink-0 text-indigo-600" />
                    <span className="truncate">
                      {selectedApplication.resume.original_filename || "Candidate Resume"}
                    </span>
                  </div>
                  <a
                    href={selectedApplication.resume.file}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
                  >
                    Download <ExternalLink className="size-3" />
                  </a>
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <Button
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 text-xs"
                  disabled={updateStatusMutation.isPending}
                  onClick={() => {
                    handleStatusTransition(selectedApplication.id, "REJECTED")
                    setSelectedApplication(null)
                  }}
                >
                  Reject
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="text-xs"
                    onClick={() => setSelectedApplication(null)}
                  >
                    Close
                  </Button>

                  {NEXT_STATUS[selectedApplication.status] && (
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => {
                        const next = NEXT_STATUS[selectedApplication.status]!
                        handleStatusTransition(selectedApplication.id, next)
                        setSelectedApplication(null)
                      }}
                    >
                      {NEXT_STATUS_LABEL[selectedApplication.status]}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===================== CANDIDATE APPLY MODAL ===================== */}
      <Dialog
        open={!!selectedJobToApply}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJobToApply(null)
            setResumeFile(null)
            setCoverLetter("")
            setApplyError(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <div className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Apply to {selectedJobToApply?.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">
              {selectedJobToApply?.company?.name} ·{" "}
              {selectedJobToApply?.location || "Remote"}
            </DialogDescription>
          </div>

          {applyError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{applyError}</span>
            </div>
          )}

          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm ${getAvatarColor(
                  selectedJobToApply?.company?.name
                )}`}
              >
                {selectedJobToApply?.company?.name
                  ? selectedJobToApply.company.name.charAt(0).toUpperCase()
                  : "C"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">
                  {selectedJobToApply?.title}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {selectedJobToApply?.company?.name} ·{" "}
                  {formatSalary(
                    selectedJobToApply?.salary_min,
                    selectedJobToApply?.salary_max
                  )}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Resume Document <span className="text-rose-500">*</span>
              </label>

              {!resumeFile ? (
                <label
                  htmlFor="resume-upload"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-8 text-center transition-colors hover:border-indigo-500 hover:bg-indigo-50/20"
                >
                  <UploadCloud className="mb-2 size-8 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-700">
                    Upload your resume
                  </span>
                  <span className="mt-1 text-xs text-slate-400">
                    PDF or DOCX up to 5MB · Analyzed by AI parser
                  </span>
                  <input
                    id="resume-upload"
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="size-6 shrink-0 text-indigo-600" />
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {resumeFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to
                        submit
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setResumeFile(null)}
                    className="size-8 p-0 text-slate-400 hover:text-slate-700"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cover Note <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Introduce yourself and highlight key qualifications..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={applyMutation.isPending}
                onClick={() => setSelectedJobToApply(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={applyMutation.isPending || !resumeFile}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2 min-w-36"
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App
