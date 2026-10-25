import { FormEvent, KeyboardEvent, useState } from "react"
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
  MapPin,
  Clock3,
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

type IconType = typeof Users

const pipeline = [
  { label: "Applied", value: 286, width: "100%", color: "bg-indigo-500" },
  { label: "Screening", value: 174, width: "61%", color: "bg-violet-500" },
  { label: "Interview", value: 92, width: "32%", color: "bg-amber-400" },
  { label: "Offered", value: 36, width: "13%", color: "bg-emerald-500" },
]

const recentJobs = [
  { title: "Senior Product Designer", department: "Design", applicants: 68, status: "Active", updated: "Today" },
  { title: "Frontend Engineer", department: "Engineering", applicants: 54, status: "Active", updated: "Yesterday" },
  { title: "Growth Marketing Manager", department: "Marketing", applicants: 42, status: "Active", updated: "Oct 22" },
  { title: "Customer Success Lead", department: "Customer", applicants: 31, status: "Paused", updated: "Oct 18" },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [postOpen, setPostOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [skills, setSkills] = useState(["Figma", "User research"])
  const [skillInput, setSkillInput] = useState("")

  function addSkill(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      const skill = skillInput.trim()
      if (skill && !skills.some((item) => item.toLowerCase() === skill.toLowerCase())) setSkills([...skills, skill])
      setSkillInput("")
    }
  }

  function publishJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPostOpen(false)
    setNotice("Job requisition published successfully. Your hiring team can now review applicants.")
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <aside className={`${sidebarOpen ? "w-[238px]" : "w-[76px]"} fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white transition-all lg:flex lg:flex-col`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><BriefcaseBusiness className="size-5" /></div>
          {sidebarOpen && <span className="text-lg font-bold tracking-tight">Smart<span className="text-indigo-600">ATS</span></span>}
        </div>
        <div className="flex flex-1 flex-col justify-between p-3">
          <nav className="flex flex-col gap-1" aria-label="Recruiter navigation">
            <NavItem icon={LayoutDashboard} label="Overview" active expanded={sidebarOpen} />
            <NavItem icon={BriefcaseBusiness} label="Job Management" expanded={sidebarOpen} count="12" />
            <NavItem icon={Users} label="Candidates" expanded={sidebarOpen} />
            <NavItem icon={BarChart3} label="Analytics" expanded={sidebarOpen} />
          </nav>
          <div className="flex flex-col gap-1">
            <NavItem icon={Settings2} label="Settings" expanded={sidebarOpen} />
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Toggle sidebar"><Menu className="size-5 shrink-0" />{sidebarOpen && <span>Collapse menu</span>}</button>
          </div>
        </div>
      </aside>

      <div className={`${sidebarOpen ? "lg:pl-[238px]" : "lg:pl-[76px]"} min-h-screen transition-all`}>
        <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden"><div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white"><BriefcaseBusiness className="size-4" /></div><span className="font-bold">Smart<span className="text-indigo-600">ATS</span></span></div>
          <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recruiter workspace</p><h1 className="mt-1 text-lg font-bold">Analytics overview</h1></div>
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="relative"><Bell className="size-5" /><span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></Button><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-50"><div className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">JD</div><div className="hidden text-left sm:block"><p className="text-sm font-semibold">Jordan Davis</p><p className="text-[11px] text-slate-400">Recruiter</p></div><ChevronDown className="hidden size-4 text-slate-400 sm:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>View profile</DropdownMenuItem><DropdownMenuItem>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
        </header>

        <main className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Workspace</span><ChevronRight className="size-3" /><span className="text-indigo-600">Overview</span></div><h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Hiring performance</h2><p className="mt-1 text-sm text-slate-500">Track your hiring pipeline and make your next great hire.</p></div><Button onClick={() => setPostOpen(true)}><Plus data-icon="inline-start" /> Post New Job</Button></div>
          {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice(null)}><X className="size-4" /></button></div>}
          <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total active jobs" value="12" note="+2 this month" icon={BriefcaseBusiness} /><Metric label="Total applicants" value="486" note="+18.4% vs last month" icon={Users} /><Metric label="Avg. time-to-hire" value="18 days" note="4 days faster" icon={Clock3} /><Metric label="Offer acceptance rate" value="84.6%" note="+6.2% vs last month" icon={Check} /></div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h3 className="text-base font-bold">Pipeline drop-off</h3><p className="mt-1 text-xs text-slate-500">Candidate volume across your hiring stages</p></div><Select value="30 days"><SelectTrigger className="h-9 w-[118px] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30 days">Last 30 days</SelectItem><SelectItem value="90 days">Last 90 days</SelectItem></SelectContent></Select></div><div className="mt-8 flex flex-col gap-5">{pipeline.map((stage) => <div key={stage.label} className="flex items-center gap-4"><span className="w-[72px] text-xs font-semibold text-slate-500">{stage.label}</span><div className="h-8 flex-1 rounded-lg bg-slate-100"><div className={`flex h-full items-center justify-end rounded-lg px-3 text-xs font-bold text-white ${stage.color}`} style={{ width: stage.width }}>{stage.value}</div></div><span className="w-10 text-right text-xs font-bold text-slate-700">{stage.value}</span></div>)}</div><div className="mt-7 flex items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-indigo-500" />Candidate volume</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-200" />Drop-off area</span></div></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between"><div><h3 className="text-base font-bold">Hiring summary</h3><p className="mt-1 text-xs text-slate-500">Progress toward quarterly goals</p></div><Sparkles className="size-5 text-indigo-500" /></div><div className="mt-6 flex items-center gap-6"><div className="grid size-32 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#6366f1 68%, #e2e8f0 0)" }}><div className="grid size-24 place-items-center rounded-full bg-white"><div className="text-center"><p className="text-2xl font-bold">68%</p><p className="text-[10px] text-slate-400">goal complete</p></div></div></div><div className="flex flex-col gap-4"><div><p className="text-xs text-slate-500">Roles filled</p><p className="mt-0.5 text-lg font-bold">17 <span className="text-xs font-medium text-slate-400">of 25</span></p></div><div><p className="text-xs text-slate-500">Offers pending</p><p className="mt-0.5 text-lg font-bold">4 <span className="text-xs font-medium text-emerald-600">on track</span></p></div></div></div></section>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="text-base font-bold">Recent job requisitions</h3><p className="mt-1 text-xs text-slate-500">Monitor applicant activity across open roles.</p></div><div className="relative w-full sm:w-56"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><Input className="h-9 pl-9 text-xs" placeholder="Search jobs..." /></div></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400"><th className="pb-3 font-semibold">Job title</th><th className="pb-3 font-semibold">Applicants</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Last updated</th><th className="pb-3" /></tr></thead><tbody>{recentJobs.map((job) => <tr key={job.title} className="border-b border-slate-50 last:border-0"><td className="py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600"><FileText className="size-4" /></div><div><p className="text-sm font-semibold">{job.title}</p><p className="mt-0.5 text-xs text-slate-400">{job.department}</p></div></div></td><td className="py-4 text-sm font-semibold text-slate-700">{job.applicants}</td><td className="py-4"><Badge variant={job.status === "Active" ? "success" : "secondary"}>{job.status}</Badge></td><td className="py-4 text-xs text-slate-500">{job.updated}</td><td className="py-4 text-right"><Button variant="ghost" size="sm">View details <ChevronRight data-icon="inline-end" /></Button></td></tr>)}</tbody></table></div></section>
        </main>
      </div>

      <Dialog open={postOpen} onOpenChange={setPostOpen}><DialogContent className="left-auto right-0 top-0 h-full w-full max-w-[560px] translate-x-0 translate-y-0 overflow-y-auto rounded-none rounded-l-2xl p-6 sm:p-8"><div className="mb-7"><div className="mb-3 grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><BriefcaseBusiness className="size-5" /></div><DialogTitle className="text-xl font-bold">Post a new job</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">Create a requisition and start finding your next great hire.</DialogDescription></div><form onSubmit={publishJob} className="flex flex-col gap-5"><div className="grid gap-5 sm:grid-cols-2"><Field label="Job title" required><Input required placeholder="e.g. Senior Product Designer" /></Field><Field label="Department" required><Select><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent><SelectItem value="design">Design</SelectItem><SelectItem value="engineering">Engineering</SelectItem><SelectItem value="marketing">Marketing</SelectItem><SelectItem value="customer">Customer Success</SelectItem></SelectContent></Select></Field></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Job type" required><Select><SelectTrigger><SelectValue placeholder="Select job type" /></SelectTrigger><SelectContent><SelectItem value="full-time">Full-time</SelectItem><SelectItem value="contract">Contract</SelectItem><SelectItem value="remote">Remote</SelectItem></SelectContent></Select></Field><Field label="Location" required><Input required placeholder="e.g. New York, NY" /></Field></div><div><label className="mb-2 block text-xs font-bold text-slate-700">Salary range</label><div className="grid grid-cols-2 gap-3"><Input type="number" placeholder="Minimum" aria-label="Minimum salary" /><Input type="number" placeholder="Maximum" aria-label="Maximum salary" /></div></div><Field label="Job description" required><textarea required className="min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder="Describe the role, responsibilities, and what success looks like..." /></Field><div><label className="mb-2 block text-xs font-bold text-slate-700">Required skills</label><Input value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={addSkill} placeholder="Type a skill and press Enter" /><div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <Badge key={skill} variant="outline" className="gap-1 border-indigo-200 bg-indigo-50 text-indigo-700">{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => setSkills(skills.filter((item) => item !== skill))}><X className="size-3" /></button></Badge>)}</div></div><div className="mt-3 flex gap-3 border-t border-slate-100 pt-5"><Button type="button" variant="outline" className="flex-1" onClick={() => setPostOpen(false)}>Cancel</Button><Button type="submit" className="flex-1">Publish Job Requisition</Button></div></form></DialogContent></Dialog>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div><label className="mb-2 block text-xs font-bold text-slate-700">{label}{required && <span className="ml-1 text-rose-500">*</span>}</label>{children}</div> }
function NavItem({ icon: Icon, label, active, expanded, count }: { icon: IconType; label: string; active?: boolean; expanded: boolean; count?: string }) { return <button className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className="size-5 shrink-0" />{expanded && <><span className="flex-1 text-left">{label}</span>{count && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">{count}</span>}</>}</button> }
function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: IconType }) { return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="size-5" /></div><div><p className="text-xs font-medium text-slate-500">{label}</p><div className="mt-0.5 flex items-baseline gap-2"><p className="text-xl font-bold">{value}</p><p className="text-[11px] font-medium text-emerald-600">{note}</p></div></div></div> }

export default App
