import { useMemo, useState } from "react"
import {
  Bell, BriefcaseBusiness, Check, ChevronRight, CircleUserRound, FileText, Filter, Home,
  LayoutDashboard, MapPin, Menu, Search, Settings2, UploadCloud, Users, X,
} from "lucide-react"
import {
  Badge, Button, Dialog, DialogContent, DialogDescription, DialogTitle, DropdownMenu,
  DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Select, SelectContent,
  SelectItem, SelectTrigger, SelectValue,
} from "./components/ui/primitives"

type Job = { id: number; title: string; company: string; initials: string; location: string; salary: string; type: string; skills: string[]; color: string; posted: string }

const jobs: Job[] = [
  { id: 1, title: "Senior Frontend Engineer", company: "Vercel", initials: "V", location: "Remote · United States", salary: "$150k – $190k", type: "Full-time", skills: ["React", "TypeScript", "Next.js"], color: "bg-black", posted: "2d ago" },
  { id: 2, title: "Product Designer", company: "Linear", initials: "L", location: "San Francisco, CA", salary: "$125k – $165k", type: "Full-time", skills: ["Figma", "Prototyping", "UI/UX"], color: "bg-indigo-600", posted: "4d ago" },
  { id: 3, title: "Backend Engineer", company: "Stripe", initials: "S", location: "Remote · Europe", salary: "$140k – $185k", type: "Remote", skills: ["Python", "Postgres", "AWS"], color: "bg-violet-600", posted: "1w ago" },
  { id: 4, title: "Growth Marketing Lead", company: "Notion", initials: "N", location: "New York, NY", salary: "$110k – $145k", type: "Full-time", skills: ["Growth", "SEO", "Analytics"], color: "bg-slate-900", posted: "1w ago" },
  { id: 5, title: "Mobile Developer", company: "Ramp", initials: "R", location: "New York, NY · Hybrid", salary: "$135k – $175k", type: "Contract", skills: ["React Native", "Swift", "iOS"], color: "bg-emerald-600", posted: "2w ago" },
  { id: 6, title: "Data Scientist", company: "Datadog", initials: "D", location: "Boston, MA", salary: "$130k – $170k", type: "Remote", skills: ["Python", "SQL", "Machine Learning"], color: "bg-cyan-700", posted: "2w ago" },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [search, setSearch] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("all")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const matchesSearch = `${job.title} ${job.company}`.toLowerCase().includes(search.toLowerCase())
    const matchesLocation = job.location.toLowerCase().includes(location.toLowerCase())
    const matchesType = jobType === "all" || job.type === jobType
    return matchesSearch && matchesLocation && matchesType
  }), [search, location, jobType])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <aside className={`${sidebarOpen ? "w-[248px]" : "w-[78px]"} fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white transition-all lg:flex lg:flex-col`}>
        <div className="flex h-[84px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white"><BriefcaseBusiness className="size-5" /></div>
          {sidebarOpen && <span className="text-lg font-bold tracking-tight">Smart<span className="text-brand">ATS</span></span>}
        </div>
        <div className="flex flex-1 flex-col justify-between p-4">
          <nav className="flex flex-col gap-1.5" aria-label="Main navigation">
            <NavItem icon={Search} label="Find Jobs" active expanded={sidebarOpen} />
            <NavItem icon={FileText} label="My Applications" expanded={sidebarOpen} count="4" />
            <NavItem icon={CircleUserRound} label="Profile" expanded={sidebarOpen} />
          </nav>
          <nav className="flex flex-col gap-1.5">
            <NavItem icon={Settings2} label="Settings" expanded={sidebarOpen} />
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Toggle sidebar">
              <Menu className="size-5 shrink-0" />{sidebarOpen && <span>Collapse menu</span>}
            </button>
          </nav>
        </div>
      </aside>

      <div className={`${sidebarOpen ? "lg:pl-[248px]" : "lg:pl-[78px]"} min-h-screen transition-all`}>
        <header className="flex h-[84px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid size-8 place-items-center rounded-lg bg-brand text-white"><BriefcaseBusiness className="size-4" /></div><span className="font-bold">Smart<span className="text-brand">ATS</span></span></div>
          <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Candidate portal</p><h1 className="mt-1 text-lg font-bold">Find your next opportunity</h1></div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="relative"><Bell className="size-5" /><span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></Button>
            <DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-full p-1.5 hover:bg-slate-50"><div className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-brand">JD</div><span className="hidden text-sm font-semibold text-slate-700 sm:block">Jordan Davis</span><ChevronRight className="hidden size-4 rotate-90 text-slate-400 sm:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>View profile</DropdownMenuItem><DropdownMenuItem>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-[1450px] px-5 py-7 sm:px-8 lg:px-10">
          <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Workspace</span><ChevronRight className="size-3" /><span className="text-brand">Find Jobs</span></div><h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Explore open roles</h2><p className="mt-1 text-sm text-slate-500">Discover your next career move from {jobs.length * 48}+ opportunities.</p></div><Button variant="outline" size="sm"><Filter data-icon="inline-start" /> Saved searches <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">2</span></Button></section>
          <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft"><div className="grid gap-3 md:grid-cols-[1.7fr_1fr_1.25fr_auto]"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input aria-label="Search job titles" placeholder="Search job titles or companies" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" /></div><Select value={jobType} onValueChange={setJobType}><SelectTrigger aria-label="Job Type"><SelectValue placeholder="Job Type" /></SelectTrigger><SelectContent><SelectItem value="all">All job types</SelectItem><SelectItem value="Full-time">Full-time</SelectItem><SelectItem value="Remote">Remote</SelectItem><SelectItem value="Contract">Contract</SelectItem></SelectContent></Select><div className="relative"><MapPin className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input aria-label="Location" placeholder="Location or remote" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" /></div><Button className="h-11 px-5">Search jobs</Button></div></section>
          <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-slate-700"><span className="text-brand">{filteredJobs.length * 48}</span> jobs matching your search</p><button className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-brand">Sort by: Recommended <ChevronRight className="size-3 rotate-90" /></button></div>
          {filteredJobs.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredJobs.map((job) => <JobCard key={job.id} job={job} onApply={() => { setSubmitted(false); setSelectedJob(job) }} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center"><Search className="mx-auto mb-3 size-8 text-slate-300" /><p className="font-semibold">No roles found</p><p className="mt-1 text-sm text-slate-500">Try broadening your search.</p></div>}
        </main>
      </div>

      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}><DialogContent><div className="mb-6"><DialogTitle className="text-xl font-bold">Apply to {selectedJob?.title}</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">{selectedJob?.company} · {selectedJob?.location}</DialogDescription></div>{submitted ? <div className="rounded-xl bg-emerald-50 p-6 text-center"><div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-6" /></div><p className="font-bold text-emerald-900">Application submitted</p><p className="mt-1 text-sm text-emerald-700">You&apos;re all set. We&apos;ll keep you posted on next steps.</p></div> : <><div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><div className={`grid size-10 place-items-center rounded-lg text-sm font-bold text-white ${selectedJob?.color}`}>{selectedJob?.initials}</div><div><p className="text-sm font-bold">{selectedJob?.title}</p><p className="text-xs text-slate-500">{selectedJob?.company} · {selectedJob?.salary}</p></div></div><label htmlFor="resume-upload" className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-10 text-center transition-colors hover:border-brand hover:bg-indigo-50/30"><UploadCloud className="mb-3 size-8 text-brand" /><span className="text-sm font-bold text-slate-700">Upload your resume</span><span className="mt-1 text-xs text-slate-400">Drag and drop or click to browse · PDF or DOCX up to 10MB</span><input id="resume-upload" type="file" accept=".pdf,.docx" className="sr-only" /></label><Button className="mt-5 w-full" onClick={() => setSubmitted(true)}>Submit Application</Button></>}</DialogContent></Dialog>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, expanded, count }: { icon: typeof Search; label: string; active?: boolean; expanded: boolean; count?: string }) { return <button className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${active ? "bg-indigo-50 text-brand" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className="size-5 shrink-0" />{expanded && <><span className="flex-1 text-left">{label}</span>{count && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-brand">{count}</span>}</>}</button> }

function JobCard({ job, onApply }: { job: Job; onApply: () => void }) { return <article className="group flex min-h-[262px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg"><div className="flex items-start justify-between"><div className={`grid size-11 place-items-center rounded-xl text-base font-bold text-white ${job.color}`}>{job.initials}</div><Badge variant="outline">{job.posted}</Badge></div><div className="mt-5"><h3 className="text-[17px] font-bold tracking-tight text-slate-900">{job.title}</h3><p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-slate-600">{job.company}<span className="inline-flex size-4 items-center justify-center rounded-full bg-brand text-white"><Check className="size-3" /></span><span className="text-xs text-slate-400">Verified</span></p></div><div className="mt-4 flex flex-col gap-2 text-xs text-slate-500"><span className="flex items-center gap-2"><MapPin className="size-3.5 text-slate-400" />{job.location}</span><span className="flex items-center gap-2"><BriefcaseBusiness className="size-3.5 text-slate-400" />{job.salary} <span className="text-slate-300">·</span> {job.type}</span></div><div className="mt-auto flex items-end justify-between gap-3 pt-5"><div className="flex flex-wrap gap-1.5">{job.skills.map((skill) => <Badge key={skill}>{skill}</Badge>)}</div><Button size="sm" onClick={onApply}>Apply <ChevronRight data-icon="inline-end" /></Button></div></article> }

export default App
