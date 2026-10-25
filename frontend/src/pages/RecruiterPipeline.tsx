import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileText,
  Kanban,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/primitives"
import { useAnalytics } from "../hooks/useAnalytics"
import {
  Application,
  ApplicationStatus,
  useApplications,
  useUpdateApplicationStatus,
} from "../hooks/useApplications"
import {
  useCompanies,
  useCreateJob,
  useJobs,
} from "../hooks/useJobs"
import { getCurrentUser, logoutUser } from "../lib/auth"

const AVATAR_COLORS: string[] = [
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
  if (!text) return "RC"
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

export default function RecruiterPipeline(): React.ReactElement {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  const [activeTab, setActiveTab] = useState<"kanban" | "analytics">("kanban")
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)

  // Global Toast
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  // Kanban State
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all")
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(
    null
  )

  // Job Posting Modal State
  const [postOpen, setPostOpen] = useState<boolean>(false)
  const [postTitle, setPostTitle] = useState<string>("")
  const [postCompanyId, setPostCompanyId] = useState<string>("")
  const [postDepartment, setPostDepartment] = useState<string>("Engineering")
  const [postJobType, setPostJobType] = useState<string>("FULL_TIME")
  const [postLocation, setPostLocation] = useState<string>("Remote")
  const [postSalaryMin, setPostSalaryMin] = useState<string>("")
  const [postSalaryMax, setPostSalaryMax] = useState<string>("")
  const [postDescription, setPostDescription] = useState<string>("")
  const [postSkills, setPostSkills] = useState<string[]>([
    "Python",
    "Django",
    "React",
  ])
  const [skillInput, setSkillInput] = useState<string>("")
  const [postError, setPostError] = useState<string | null>(null)

  // API Hooks
  const {
    data: applications = [],
    isLoading: isLoadingApps,
    isError: isErrorApps,
    refetch: refetchApps,
  } = useApplications({
    job_id: selectedJobFilter !== "all" ? selectedJobFilter : undefined,
  })

  const updateStatusMutation = useUpdateApplicationStatus()

  const {
    data: jobs = [],
  } = useJobs({
    is_active: true,
  })

  const { data: companies = [] } = useCompanies()
  const {
    data: analytics,
    isLoading: isLoadingAnalytics,
    refetch: refetchAnalytics,
  } = useAnalytics()

  const createJobMutation = useCreateJob()

  // Safeguard: Automatically select recruiter's company or first verified company
  useEffect(() => {
    if (companies.length > 0 && !postCompanyId) {
      if (currentUser?.company_id && companies.some((c) => c.id === currentUser.company_id)) {
        setPostCompanyId(currentUser.company_id)
        return
      }
      if (currentUser?.company_name) {
        const matched = companies.find(
          (c) => c.name.toLowerCase() === currentUser.company_name?.toLowerCase()
        )
        if (matched) {
          setPostCompanyId(matched.id)
          return
        }
      }
      const defaultCompany = companies.find((c) => c.is_verified) || companies[0]
      if (defaultCompany) {
        setPostCompanyId(defaultCompany.id)
      }
    }
  }, [companies, currentUser, postCompanyId])

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
  ): Promise<void> => {
    try {
      await updateStatusMutation.mutateAsync({
        applicationId,
        newStatus,
      })
      setToastNotice(`Application moved to ${newStatus} successfully.`)
      if (selectedApplication?.id === applicationId) {
        setSelectedApplication((prev) =>
          prev ? { ...prev, status: newStatus } : null
        )
      }
    } catch (err: unknown) {
      let msg = "Failed to update application status."
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, any> | undefined
        if (data?.detail) {
          msg = String(data.detail)
        } else if (Array.isArray(data?.status) && data.status.length > 0) {
          msg = String(data.status[0])
        }
      }
      setToastNotice(`Error: ${msg}`)
    }
  }

  // Handle Skill Chip Adding
  const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      e.preventDefault()
      const val = skillInput.trim()
      if (
        val &&
        !postSkills.some((s) => s.toLowerCase() === val.toLowerCase())
      ) {
        setPostSkills([...postSkills, val])
      }
      setSkillInput("")
    }
  }

  const handleOpenPostModal = (): void => {
    if (companies.length > 0 && !postCompanyId) {
      const defaultCompany =
        (currentUser?.company_id && companies.find((c) => c.id === currentUser.company_id)) ||
        (currentUser?.company_name &&
          companies.find(
            (c) => c.name.toLowerCase() === currentUser.company_name?.toLowerCase()
          )) ||
        companies.find((c) => c.is_verified) ||
        companies[0]
      if (defaultCompany) {
        setPostCompanyId(defaultCompany.id)
      }
    }
    setPostOpen(true)
  }

  // Handle Job Creation Submit
  const handleCreateJobSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault()
    setPostError(null)

    const chosenCompanyId =
      postCompanyId ||
      currentUser?.company_id ||
      (currentUser?.company_name &&
        companies.find(
          (c) => c.name.toLowerCase() === currentUser.company_name?.toLowerCase()
        )?.id) ||
      companies.find((c) => c.is_verified)?.id ||
      companies[0]?.id

    if (!chosenCompanyId) {
      setPostError("Please select a valid company for this job requisition.")
      return
    }

    try {
      await createJobMutation.mutateAsync({
        title: postTitle.trim(),
        company_id: chosenCompanyId,
        department: postDepartment.trim() || undefined,
        location: postLocation.trim() || "Remote",
        job_type: postJobType,
        salary_min: postSalaryMin ? Number(postSalaryMin) : undefined,
        salary_max: postSalaryMax ? Number(postSalaryMax) : undefined,
        description: postDescription.trim(),
        skills: postSkills.map((s) => ({ skill_name: s, is_required: true })),
        is_active: true,
      })

      setToastNotice(
        `Job requisition "${postTitle}" published successfully! Candidates can now discover and apply.`
      )
      setPostOpen(false)
      setPostTitle("")
      setPostSalaryMin("")
      setPostSalaryMax("")
      setPostDescription("")
      setPostSkills(["Python", "Django", "React"])
    } catch (err: unknown) {
      let detail = "Failed to create job requisition. Please check your inputs."
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, any> | undefined
        if (data?.detail) {
          detail = String(data.detail)
        } else if (Array.isArray(data?.company) && data.company.length > 0) {
          detail = String(data.company[0])
        } else if (Array.isArray(data?.salary_min) && data.salary_min.length > 0) {
          detail = String(data.salary_min[0])
        }
      }
      setPostError(detail)
    }
  }

  // Calculate funnel max for progress width
  const funnelMax = useMemo(() => {
    if (!analytics?.status_funnel) return 1
    const vals = Object.values(analytics.status_funnel) as number[]
    return Math.max(1, ...vals)
  }, [analytics])

  const userDisplayName =
    currentUser?.first_name || currentUser?.email?.split("@")[0] || "Recruiter"
  const userInitials = getInitials(currentUser?.email || "RC")

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
              type="button"
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
              type="button"
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

            <button
              type="button"
              onClick={() => navigate("/candidate/jobs")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <Search className="size-5 shrink-0" />
              {sidebarOpen && <span className="flex-1 text-left">Candidate Portal</span>}
            </button>
          </nav>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            <button
              type="button"
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
              {activeTab === "kanban" ? "Recruiter Workspace" : "Analytics Dashboard"}
            </p>
            <h1 className="mt-0.5 text-lg font-bold">
              {activeTab === "kanban"
                ? "Applicant Pipeline & AI Matching"
                : "Hiring Performance & Metrics"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleOpenPostModal}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-xs gap-1.5"
            >
              <Plus className="size-3.5" /> Post New Job
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5 text-slate-500" />
              <span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </Button>

            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full p-1.5 hover:bg-slate-50"
                >
                  <div className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {userInitials}
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-sm font-semibold truncate max-w-[140px]">
                      {userDisplayName}
                    </p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {currentUser?.role?.toLowerCase() || "Recruiter"}
                    </p>
                  </div>
                  <ChevronRight className="hidden size-4 rotate-90 text-slate-400 sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser?.email || "recruiter@technova.com"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Role: {currentUser?.role || "RECRUITER"}
                  </p>
                </div>
                <DropdownMenuItem onClick={() => setActiveTab("kanban")}>
                  Pipeline Workspace
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("analytics")}>
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logoutUser(navigate)}
                  className="text-rose-600 focus:text-rose-700 font-semibold cursor-pointer"
                >
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
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

        {/* ===================== TAB 1: KANBAN PIPELINE ===================== */}
        {activeTab === "kanban" && (
          <main className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10">
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

            {/* Kanban Columns */}
            {!isLoadingApps && !isErrorApps && (
              <section className="overflow-x-auto pb-6">
                <div className="flex min-w-[1180px] gap-4">
                  {KANBAN_COLUMNS.map((column) => {
                    const columnApps = applicationsByStatus[column.id] || []
                    return (
                      <div key={column.id} className="w-[225px] shrink-0 xl:flex-1">
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

        {/* ===================== TAB 2: RECRUITER ANALYTICS ===================== */}
        {activeTab === "analytics" && (
          <main className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>Workspace</span>
                  <ChevronRight className="size-3" />
                  <span className="text-indigo-600 font-semibold">Overview</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">
                  Hiring Performance
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Monitor your applicant pipeline drop-off, stage durations, and requisition activity.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAnalytics()}
                  className="gap-2 text-xs"
                >
                  <RefreshCw
                    className={`size-3.5 ${
                      isLoadingAnalytics ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
                <Button
                  onClick={handleOpenPostModal}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs gap-1.5"
                >
                  <Plus className="size-3.5" /> Post New Job
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <BriefcaseBusiness className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Active Jobs</p>
                  <p className="mt-0.5 text-xl font-bold">
                    {analytics?.total_active_jobs ?? jobs.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Applicants</p>
                  <p className="mt-0.5 text-xl font-bold">
                    {analytics?.total_applications ?? applications.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Avg. Time-to-Hire</p>
                  <p className="mt-0.5 text-xl font-bold">
                    {analytics?.average_time_to_hire_days !== undefined
                      ? `${analytics.average_time_to_hire_days} days`
                      : "0 days"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Pipeline Stages</p>
                  <p className="mt-0.5 text-xl font-bold">
                    {Object.keys(analytics?.status_funnel || {}).length || 5} stages
                  </p>
                </div>
              </div>
            </div>

            {/* Pipeline Drop-off and Hiring Summary */}
            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Pipeline Drop-off
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Applicant status funnel and volume across hiring stages
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs text-indigo-600 font-semibold">
                    Live Funnel
                  </Badge>
                </div>

                <div className="mt-7 flex flex-col gap-4">
                  {[
                    { key: "APPLIED", label: "Applied", color: "bg-indigo-600" },
                    { key: "SCREENING", label: "Screening", color: "bg-violet-600" },
                    { key: "SHORTLISTED", label: "Shortlisted", color: "bg-sky-500" },
                    {
                      key: "INTERVIEW_SCHEDULED",
                      label: "Interview",
                      color: "bg-amber-400",
                    },
                    { key: "OFFERED", label: "Offered", color: "bg-emerald-500" },
                  ].map((stage) => {
                    const count = (analytics?.status_funnel as Record<string, number> | undefined)?.[stage.key] ?? 0
                    const pct = Math.round((count / funnelMax) * 100)
                    return (
                      <div key={stage.key} className="flex items-center gap-4">
                        <span className="w-24 text-xs font-semibold text-slate-600 truncate">
                          {stage.label}
                        </span>
                        <div className="h-8 flex-1 rounded-lg bg-slate-100 overflow-hidden">
                          <div
                            className={`flex h-full items-center justify-end rounded-lg px-3 text-xs font-bold text-white transition-all duration-500 ${stage.color}`}
                            style={{ width: `${Math.max(count > 0 ? 12 : 0, pct)}%` }}
                          >
                            {count > 0 ? count : ""}
                          </div>
                        </div>
                        <span className="w-12 text-right text-xs font-bold text-slate-800">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Time-in-Stage
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Average duration candidates spend in each stage
                      </p>
                    </div>
                    <Sparkles className="size-5 text-indigo-600" />
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    {analytics?.average_time_in_stage_days ? (
                      Object.entries(analytics.average_time_in_stage_days)
                        .slice(0, 5)
                        .map(([stageKey, days]) => (
                          <div
                            key={stageKey}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                          >
                            <span className="text-xs font-semibold text-slate-700 capitalize">
                              {stageKey.toLowerCase().replace("_", " ")}
                            </span>
                            <Badge variant="outline" className="text-xs font-bold">
                              {days} days
                            </Badge>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400">
                        No stage duration history recorded yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900">
                  <p className="font-semibold">Automated Insights</p>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    AI screening reduces initial review time by over 65%.
                  </p>
                </div>
              </section>
            </div>

            {/* Active Requisitions Activity Table */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Requisition Activity
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Live candidate volume mapped per job requisition
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="pb-3 font-semibold">Job Title</th>
                      <th className="pb-3 font-semibold">Company</th>
                      <th className="pb-3 font-semibold">Total Applicants</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics?.applicants_per_job &&
                    analytics.applicants_per_job.length > 0 ? (
                      analytics.applicants_per_job.map((item) => (
                        <tr key={item.job_id} className="text-sm">
                          <td className="py-3 font-semibold text-slate-900">
                            {item.job_title}
                          </td>
                          <td className="py-3 text-xs text-slate-600">
                            {item.company_name || "Internal"}
                          </td>
                          <td className="py-3 font-bold text-indigo-600">
                            {item.total_applicants}
                          </td>
                          <td className="py-3">
                            <Badge variant="success">Active</Badge>
                          </td>
                        </tr>
                      ))
                    ) : jobs.length > 0 ? (
                      jobs.map((j) => (
                        <tr key={j.id} className="text-sm">
                          <td className="py-3 font-semibold text-slate-900">
                            {j.title}
                          </td>
                          <td className="py-3 text-xs text-slate-600">
                            {j.company?.name || "Internal"}
                          </td>
                          <td className="py-3 font-bold text-slate-600">
                            {applications.filter((a) => a.job.id === j.id).length}
                          </td>
                          <td className="py-3">
                            <Badge variant="success">Active</Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-xs text-slate-400">
                          No active requisitions found. Click &quot;Post New Job&quot; to publish your first role.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
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

              {/* Conic Gradient Overall Score */}
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

              {/* Matched & Missing Skills */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

              {/* Resume File */}
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

              {/* Action Buttons */}
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

      {/* ===================== JOB POSTING MODAL ===================== */}
      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto">
          <div className="mb-4">
            <div className="mb-2 grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <BriefcaseBusiness className="size-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Post a New Job Requisition
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">
              Create a requisition to start receiving and AI-matching candidates.
            </DialogDescription>
          </div>

          {postError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{postError}</span>
            </div>
          )}

          <form onSubmit={handleCreateJobSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Senior Frontend Engineer"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Company <span className="text-rose-500">*</span>
                </label>
                <Select value={postCompanyId} onValueChange={setPostCompanyId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.is_verified ? "✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Department
                </label>
                <Input
                  placeholder="e.g. Engineering"
                  value={postDepartment}
                  onChange={(e) => setPostDepartment(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Job Type
                </label>
                <Select value={postJobType} onValueChange={setPostJobType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Job type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full-time</SelectItem>
                    <SelectItem value="REMOTE">Remote</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="PART_TIME">Part-time</SelectItem>
                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Location
                </label>
                <Input
                  placeholder="e.g. Remote / NYC"
                  value={postLocation}
                  onChange={(e) => setPostLocation(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Min Salary ($ / yr)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 120000"
                  value={postSalaryMin}
                  onChange={(e) => setPostSalaryMin(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Max Salary ($ / yr)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 160000"
                  value={postSalaryMax}
                  onChange={(e) => setPostSalaryMax(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Job Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Outline responsibilities, requirements, and tech stack..."
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
            </div>

            {/* Required Skills Chip Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Required Technical Skills (Press Enter to Add)
              </label>
              <Input
                placeholder="Type a skill (e.g. React, PostgreSQL) and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="text-sm"
              />
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {postSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700 text-xs py-1"
                  >
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() =>
                        setPostSkills(postSkills.filter((s) => s !== skill))
                      }
                      className="ml-1 text-indigo-400 hover:text-indigo-800"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={createJobMutation.isPending}
                onClick={() => setPostOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJobMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 min-w-36 gap-2"
              >
                {createJobMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish Requisition"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
