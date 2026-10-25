import { useState } from "react"
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  Sparkles,
  Users,
  X,
  TriangleAlert,
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
} from "./components/ui/primitives"

type Candidate = {
  id: number
  name: string
  initials: string
  role: string
  date: string
  score: number
  skills: string[]
  matched: string[]
  missing: string[]
  avatar: string
}

type Column = { title: string; tone: string; candidates: Candidate[] }

const candidates: Candidate[] = [
  { id: 1, name: "Sophia Williams", initials: "SW", role: "Senior Product Designer", date: "Applied Oct 24, 2026", score: 92, skills: ["Figma", "Design Systems", "Research"], matched: ["Figma", "Design Systems", "User Research", "Prototyping"], missing: ["B2B SaaS experience"], avatar: "bg-rose-100 text-rose-700" },
  { id: 2, name: "Marcus Chen", initials: "MC", role: "Senior Product Designer", date: "Applied Oct 22, 2026", score: 86, skills: ["Figma", "UX Strategy", "Prototyping"], matched: ["Figma", "UX Strategy", "Prototyping"], missing: ["Design leadership"], avatar: "bg-sky-100 text-sky-700" },
  { id: 3, name: "Priya Nair", initials: "PN", role: "Senior Product Designer", date: "Applied Oct 20, 2026", score: 78, skills: ["Sketch", "UX Research", "Mobile"], matched: ["UX Research", "Mobile Design"], missing: ["Figma", "Design systems"], avatar: "bg-amber-100 text-amber-700" },
  { id: 4, name: "James Wilson", initials: "JW", role: "Senior Product Designer", date: "Applied Oct 19, 2026", score: 68, skills: ["UI Design", "Figma", "Branding"], matched: ["UI Design", "Branding"], missing: ["UX Research", "Prototyping"], avatar: "bg-violet-100 text-violet-700" },
  { id: 5, name: "Olivia Martinez", initials: "OM", role: "Senior Product Designer", date: "Applied Oct 18, 2026", score: 94, skills: ["Figma", "Prototyping", "SaaS"], matched: ["Figma", "Prototyping", "SaaS", "Design Systems"], missing: [], avatar: "bg-emerald-100 text-emerald-700" },
  { id: 6, name: "Ethan Brown", initials: "EB", role: "Senior Product Designer", date: "Applied Oct 17, 2026", score: 83, skills: ["Figma", "Research", "Webflow"], matched: ["Figma", "User Research", "Webflow"], missing: ["Mobile design"], avatar: "bg-cyan-100 text-cyan-700" },
  { id: 7, name: "Ava Thompson", initials: "AT", role: "Senior Product Designer", date: "Applied Oct 16, 2026", score: 57, skills: ["Illustrator", "Branding", "Print"], matched: ["Branding"], missing: ["Figma", "UX Research", "Design systems"], avatar: "bg-pink-100 text-pink-700" },
  { id: 8, name: "Noah Kim", initials: "NK", role: "Senior Product Designer", date: "Applied Oct 15, 2026", score: 89, skills: ["Figma", "UI/UX", "Analytics"], matched: ["Figma", "UI/UX", "Analytics"], missing: ["Design leadership"], avatar: "bg-indigo-100 text-indigo-700" },
  { id: 9, name: "Liam Davis", initials: "LD", role: "Senior Product Designer", date: "Applied Oct 14, 2026", score: 91, skills: ["Figma", "Systems", "Strategy"], matched: ["Figma", "Design Systems", "Strategy"], missing: [], avatar: "bg-orange-100 text-orange-700" },
  { id: 10, name: "Isabella Garcia", initials: "IG", role: "Senior Product Designer", date: "Applied Oct 12, 2026", score: 76, skills: ["UX Research", "Figma", "Mobile"], matched: ["UX Research", "Mobile Design"], missing: ["Design systems"], avatar: "bg-teal-100 text-teal-700" },
]

const columns: Column[] = [
  { title: "Applied", tone: "bg-slate-400", candidates: candidates.slice(0, 2) },
  { title: "Screening", tone: "bg-amber-400", candidates: candidates.slice(2, 4) },
  { title: "Shortlisted", tone: "bg-indigo-500", candidates: candidates.slice(4, 6) },
  { title: "Interview", tone: "bg-violet-500", candidates: candidates.slice(6, 8) },
  { title: "Offered", tone: "bg-emerald-500", candidates: candidates.slice(8, 10) },
]

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-rose-50 text-rose-700 border-rose-200"
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <aside className={`${sidebarOpen ? "w-[238px]" : "w-[76px]"} fixed inset-y-0 left-0 z-20 hidden border-r border-slate-200 bg-white transition-all lg:flex lg:flex-col`}>
        <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white"><BriefcaseBusiness className="size-5" /></div>
          {sidebarOpen && <span className="text-lg font-bold tracking-tight">Smart<span className="text-indigo-600">ATS</span></span>}
        </div>
        <div className="flex flex-1 flex-col justify-between p-3">
          <nav className="flex flex-col gap-1" aria-label="Recruiter navigation">
            <NavItem icon={LayoutDashboard} label="Pipelines" active expanded={sidebarOpen} />
            <NavItem icon={CalendarDays} label="Interviews" expanded={sidebarOpen} count="3" />
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
          <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Recruiter workspace</p><h1 className="mt-1 text-lg font-bold">Candidate pipeline</h1></div>
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="relative"><Bell className="size-5" /><span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></Button><DropdownMenu><DropdownMenuTrigger asChild><button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-50"><div className="grid size-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">JD</div><div className="hidden text-left sm:block"><p className="text-sm font-semibold">Jordan Davis</p><p className="text-[11px] text-slate-400">Recruiter</p></div><ChevronDown className="hidden size-4 text-slate-400 sm:block" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem>View profile</DropdownMenuItem><DropdownMenuItem>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
        </header>

        <main className="mx-auto max-w-[1540px] px-5 py-7 sm:px-8 lg:px-10">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400"><span>Workspace</span><ChevronRight className="size-3" /><span className="text-indigo-600">Pipelines</span></div><h2 className="text-2xl font-bold tracking-tight sm:text-[28px]">Product Designer Pipeline</h2><p className="mt-1 text-sm text-slate-500">Review and move candidates through the hiring process.</p></div><div className="flex gap-2"><Button variant="outline" size="sm"><Users data-icon="inline-start" /> All candidates <ChevronDown data-icon="inline-end" /></Button><Button size="sm"><Sparkles data-icon="inline-start" /> AI shortlist</Button></div></div>
          <div className="mb-7 grid gap-3 sm:grid-cols-3"><Metric label="Total candidates" value="48" note="12 new this week" icon={Users} /><Metric label="Average match score" value="78%" note="+6% from last week" icon={Sparkles} /><Metric label="Time to hire" value="18 days" note="4 days faster" icon={ClipboardList} /></div>
          {notice && <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice(null)}><X className="size-4" /></button></div>}
          <section className="overflow-x-auto pb-5"><div className="flex min-w-[1120px] gap-4">{columns.map((column) => <div key={column.title} className="w-[214px] shrink-0 xl:flex-1"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${column.tone}`} /><h3 className="text-sm font-bold">{column.title}</h3><span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{column.candidates.length}</span></div><button className="rounded p-1 text-slate-400 hover:bg-slate-200" aria-label={`More ${column.title} options`}><MoreHorizontal className="size-4" /></button></div><div className="flex flex-col gap-3">{column.candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} onClick={() => setSelected(candidate)} />)}<button className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-600"><span className="text-base leading-none">+</span> Add candidate</button></div></div>)}</div></section>
        </main>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-w-[520px]"><div className="mb-5 flex items-start justify-between pr-5"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600"><Sparkles className="size-3.5" /> AI explainability</div><DialogTitle className="text-xl font-bold">{selected?.name}</DialogTitle><DialogDescription className="mt-1 text-sm text-slate-500">{selected?.role} · {selected?.date}</DialogDescription></div><div className={`rounded-lg border px-2.5 py-1 text-sm font-bold ${selected ? scoreTone(selected.score) : ""}`}>{selected?.score}% match</div></div><div className="flex flex-col items-center rounded-2xl bg-slate-50 py-6"><div className="grid size-32 place-items-center rounded-full" style={{ background: `conic-gradient(#6366f1 ${selected?.score ?? 0}%, #e2e8f0 0)` }}><div className="grid size-[104px] place-items-center rounded-full bg-white"><div className="text-center"><p className="text-3xl font-bold tracking-tight">{selected?.score}%</p><p className="text-[11px] font-medium text-slate-400">Overall score</p></div></div></div><p className="mt-3 text-sm font-medium text-slate-600">Strong candidate for this role</p></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><SkillList title="Matched skills" skills={selected?.matched ?? []} positive /><SkillList title="Missing critical skills" skills={selected?.missing ?? []} /></div><div className="mt-7 flex gap-3"><Button className="flex-1" onClick={() => { setNotice(`${selected?.name} moved to the interview stage.`); setSelected(null) }}><CalendarDays data-icon="inline-start" /> Schedule interview</Button><Button variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => { setNotice(`${selected?.name} was rejected.`); setSelected(null) }}>Reject</Button></div></DialogContent></Dialog>
    </div>
  )
}

function NavItem({ icon: Icon, label, active, expanded, count }: { icon: typeof Search; label: string; active?: boolean; expanded: boolean; count?: string }) { return <button className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className="size-5 shrink-0" />{expanded && <><span className="flex-1 text-left">{label}</span>{count && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-700">{count}</span>}</>}</button> }

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Users }) { return <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="size-5" /></div><div><p className="text-xs font-medium text-slate-500">{label}</p><div className="mt-0.5 flex items-baseline gap-2"><p className="text-xl font-bold">{value}</p><p className="text-[11px] font-medium text-emerald-600">{note}</p></div></div></div> }

function CandidateCard({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) { return <button onClick={onClick} className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"><div className="flex items-start justify-between gap-2"><div className={`grid size-9 place-items-center rounded-full text-xs font-bold ${candidate.avatar}`}>{candidate.initials}</div><span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${scoreTone(candidate.score)}`}>{candidate.score}%</span></div><div className="mt-3"><h4 className="truncate text-sm font-bold text-slate-900">{candidate.name}</h4><p className="mt-0.5 truncate text-xs text-slate-500">{candidate.role}</p><p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><CalendarDays className="size-3" /> {candidate.date}</p></div><div className="mt-3 flex flex-wrap gap-1.5">{candidate.skills.map((skill) => <Badge key={skill} variant="outline" className="px-1.5 py-0.5 text-[10px]">{skill}</Badge>)}</div><div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-semibold text-indigo-600"><span className="flex items-center gap-1"><Sparkles className="size-3" /> View AI insights</span><ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></div></button> }

function SkillList({ title, skills, positive }: { title: string; skills: string[]; positive?: boolean }) { return <div><h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3><div className="flex flex-wrap gap-2">{skills.length ? skills.map((skill) => <Badge key={skill} variant="outline" className={positive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>{positive ? <Check className="mr-1 size-3" /> : <TriangleAlert className="mr-1 size-3" />}{skill}</Badge>) : <span className="text-xs text-slate-400">No gaps identified</span>}</div></div> }

export default App
