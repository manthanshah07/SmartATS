import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Kanban,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  UploadCloud,
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
import {
  formatJobType,
  formatSalary,
  Job,
  useApplyToJob,
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
  if (!text) return "CD"
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

export default function CandidateJobs(): React.ReactElement {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  // Filter State
  const [search, setSearch] = useState<string>("")
  const [location, setLocation] = useState<string>("")
  const [jobType, setJobType] = useState<string>("all")
  const [minSalary, setMinSalary] = useState<string>("all")

  // Modal State
  const [selectedJobToApply, setSelectedJobToApply] = useState<Job | null>(null)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [coverLetter, setCoverLetter] = useState<string>("")
  const [applyError, setApplyError] = useState<string | null>(null)
  const [toastNotice, setToastNotice] = useState<string | null>(null)

  // API Hooks
  const {
    data: jobs = [],
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = useJobs({
    search,
    location,
    job_type: jobType,
    salary_min: minSalary !== "all" ? minSalary : undefined,
    is_active: true,
  })

  const applyMutation = useApplyToJob()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
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

  const handleApplySubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
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
        `Application for "${selectedJobToApply.title}" at ${selectedJobToApply.company.name} submitted successfully! Our AI matcher is analyzing your profile.`
      )
      setResumeFile(null)
      setCoverLetter("")
      setSelectedJobToApply(null)
    } catch (err: unknown) {
      let detail = "Failed to submit application. Please verify your file and try again."
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as Record<string, any> | undefined
        if (data?.detail) {
          detail = String(data.detail)
        } else if (Array.isArray(data?.non_field_errors) && data.non_field_errors.length > 0) {
          detail = String(data.non_field_errors[0])
        } else if (Array.isArray(data?.file) && data.file.length > 0) {
          detail = String(data.file[0])
        }
      }
      setApplyError(detail)
    }
  }

  const userDisplayName =
    currentUser?.first_name || currentUser?.email?.split("@")[0] || "Candidate"
  const userInitials = getInitials(currentUser?.email || "CD")
  const isRecruiter =
    currentUser?.role === "RECRUITER" || currentUser?.role === "ADMIN"

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
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

        <div className="flex items-center gap-3">
          {isRecruiter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/recruiter/pipeline")}
              className="text-xs gap-1.5"
            >
              <Kanban className="size-3.5 text-indigo-600" /> Recruiter Pipeline
            </Button>
          )}

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
                    {currentUser?.role?.toLowerCase() || "Candidate"}
                  </p>
                </div>
                <ChevronRight className="hidden size-4 rotate-90 text-slate-400 sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.email || "candidate@test.com"}
                </p>
                <p className="text-[10px] text-slate-400">
                  Role: {currentUser?.role || "CANDIDATE"}
                </p>
              </div>
              {isRecruiter && (
                <DropdownMenuItem onClick={() => navigate("/recruiter/pipeline")}>
                  Recruiter Workspace
                </DropdownMenuItem>
              )}
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

      {/* Main Content */}
      <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
        <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Careers</span>
              <ChevronRight className="size-3" />
              <span className="text-indigo-600 font-semibold">Open Roles</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">
              Explore AI-Matched Opportunities
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Submit your resume to top engineering teams and track your application status.
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

        {/* Results Header */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            <span className="text-indigo-600 font-bold">{jobs.length}</span>{" "}
            {jobs.length === 1 ? "role" : "roles"} matching your criteria
          </p>
        </div>

        {/* Job Listings Grid */}
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
              Try adjusting your search criteria or removing filters.
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
