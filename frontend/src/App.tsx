import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import {
  AlertCircle,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleDollarSign,
  CircleUserRound,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Menu,
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

function getCompanyColor(name?: string): string {
  if (!name) return "bg-indigo-600"
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
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

function App() {
  const [activeTab, setActiveTab] = useState<"candidate" | "recruiter">("candidate")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Search & Filter State for Job Discovery
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("all")
  const [minSalary, setMinSalary] = useState<string>("all")

  // Application Modal State
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState("")
  const [applyError, setApplyError] = useState<string | null>(null)
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  // API Query Hooks
  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useJobs({
    search,
    location,
    job_type: jobType,
    salary_min: minSalary !== "all" ? minSalary : undefined,
    is_active: true,
  })

  // Apply Mutation Hook
  const applyMutation = useApplyToJob()

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
    if (!selectedJob) return
    if (!resumeFile) {
      setApplyError("Please select a PDF or DOCX resume to upload.")
      return
    }

    setApplyError(null)
    try {
      await applyMutation.mutateAsync({
        jobId: selectedJob.id,
        file: resumeFile,
        coverLetter: coverLetter.trim() || undefined,
      })

      setToastNotice(
        `Application for "${selectedJob.title}" at ${selectedJob.company.name} submitted successfully! AI matching is now analyzing your profile.`
      )
      // Reset modal state
      setResumeFile(null)
      setCoverLetter("")
      setSelectedJob(null)
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
      {/* Sidebar */}
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
              onClick={() => setActiveTab("recruiter")}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === "recruiter"
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="size-5 shrink-0" />
              {sidebarOpen && <span className="flex-1 text-left">Recruiter Analytics</span>}
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

      {/* Main Content Area */}
      <div
        className={`${
          sidebarOpen ? "lg:pl-[248px]" : "lg:pl-[78px]"
        } min-h-screen transition-all`}
      >
        {/* Header */}
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
              {activeTab === "candidate" ? "Candidate Portal" : "Recruiter Portal"}
            </p>
            <h1 className="mt-0.5 text-lg font-bold">
              {activeTab === "candidate"
                ? "Find your next career opportunity"
                : "Recruiter Pipeline & Analytics"}
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
                    <p className="text-[11px] text-slate-400">Candidate</p>
                  </div>
                  <ChevronRight className="hidden size-4 rotate-90 text-slate-400 sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Candidate Profile</DropdownMenuItem>
                <DropdownMenuItem>Application History</DropdownMenuItem>
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Global Toast Alert */}
        {toastNotice && (
          <div className="mx-5 mt-5 sm:mx-8 lg:mx-10">
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
              <div className="flex items-center gap-2">
                <Check className="size-5 shrink-0 text-emerald-600" />
                <span>{toastNotice}</span>
              </div>
              <button
                aria-label="Dismiss toast"
                onClick={() => setToastNotice(null)}
                className="text-emerald-600 hover:text-emerald-800"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Candidate Job Discovery View */}
        {activeTab === "candidate" && (
          <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
            {/* Title Section */}
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
                  onClick={() => refetch()}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </section>

            {/* Filter & Search Bar */}
            <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1.2fr_1fr]">
                {/* Search Keyword */}
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 size-4 text-slate-400" />
                  <Input
                    aria-label="Search job titles or companies"
                    placeholder="Search job titles, skills, or companies"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                {/* Job Type Selector */}
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger aria-label="Job Type" className="text-sm">
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

                {/* Location Filter */}
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" />
                  <Input
                    aria-label="Location"
                    placeholder="Location (e.g. San Francisco, Remote)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>

                {/* Minimum Salary Filter */}
                <Select value={minSalary} onValueChange={setMinSalary}>
                  <SelectTrigger aria-label="Minimum Salary" className="text-sm">
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

            {/* Results Count & Header */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                <span className="text-indigo-600 font-bold">{jobs.length}</span>{" "}
                {jobs.length === 1 ? "role" : "roles"} matching your criteria
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center shadow-sm">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Fetching active job requisitions...
                </p>
                <p className="text-xs text-slate-400">Connecting to live SmartATS API</p>
              </div>
            )}

            {/* Error State */}
            {!isLoading && isError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
                <AlertCircle className="mx-auto size-8 text-rose-500" />
                <p className="mt-2 text-base font-bold text-rose-900">
                  Unable to load jobs
                </p>
                <p className="mt-1 text-sm text-rose-700">
                  {(error as Error)?.message || "Failed to connect to backend server."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="mt-4 border-rose-300 bg-white text-rose-800 hover:bg-rose-100"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && jobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
                <Search className="mx-auto mb-3 size-8 text-slate-300" />
                <p className="font-semibold text-slate-800">No matching jobs found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try adjusting your filters or expanding your search location.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch("")
                    setLocation("")
                    setJobType("all")
                    setMinSalary("all")
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}

            {/* Job Cards Grid */}
            {!isLoading && !isError && jobs.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="group flex min-h-[260px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`grid size-11 place-items-center rounded-xl text-base font-bold text-white shadow-sm ${getCompanyColor(
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
                        {job.department && (
                          <span className="text-xs text-slate-400">
                            · {job.department}
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
                          setSelectedJob(job)
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

        {/* Recruiter Overview Fallback Tab */}
        {activeTab === "recruiter" && (
          <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Hiring Performance</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Track your hiring pipeline and evaluate AI candidate match breakdowns.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Active Requisitions</p>
                <p className="mt-1 text-2xl font-bold">{jobs.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Candidates Processed</p>
                <p className="mt-1 text-2xl font-bold">148</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Avg. Time-to-Hire</p>
                <p className="mt-1 text-2xl font-bold">18 days</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">AI Match Accuracy</p>
                <p className="mt-1 text-2xl font-bold">94.2%</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-4">
                Active Job Requisitions
              </h3>
              <div className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <div key={job.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                      <p className="text-xs text-slate-500">
                        {job.company?.name} · {job.location}
                      </p>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ))}
              </div>
            </div>
          </main>
        )}
      </div>

      {/* Application Dialog Modal */}
      <Dialog
        open={!!selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null)
            setResumeFile(null)
            setCoverLetter("")
            setApplyError(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <div className="mb-4">
            <DialogTitle className="text-xl font-bold text-slate-900">
              Apply to {selectedJob?.title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">
              {selectedJob?.company?.name} · {selectedJob?.location || "Remote"}
            </DialogDescription>
          </div>

          {applyError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="size-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{applyError}</span>
            </div>
          )}

          <form onSubmit={handleApplySubmit} className="space-y-4">
            {/* Selected Job Card Preview */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div
                className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold text-white shadow-sm ${getCompanyColor(
                  selectedJob?.company?.name
                )}`}
              >
                {selectedJob?.company?.name
                  ? selectedJob.company.name.charAt(0).toUpperCase()
                  : "C"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{selectedJob?.title}</p>
                <p className="text-xs text-slate-500 truncate">
                  {selectedJob?.company?.name} ·{" "}
                  {formatSalary(selectedJob?.salary_min, selectedJob?.salary_max)}
                </p>
              </div>
            </div>

            {/* Resume Upload File Picker */}
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
                        {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to submit
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

            {/* Optional Cover Letter */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Cover Note <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Introduce yourself and briefly highlight key qualifications..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                disabled={applyMutation.isPending}
                onClick={() => setSelectedJob(null)}
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
