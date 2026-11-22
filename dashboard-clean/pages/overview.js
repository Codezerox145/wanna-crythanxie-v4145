import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Metric({ label, value, note, icon, tone }) {
  const tones = { green:'bg-emerald-50 text-emerald-700', blue:'bg-blue-50 text-blue-700', purple:'bg-violet-50 text-violet-700', pink:'bg-pink-50 text-pink-700' }
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
    <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{label}</p><span className={'grid h-10 w-10 place-items-center rounded-xl text-lg '+tones[tone]}>{icon}</span></div>
    <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p>
  </div>
}
function Panel({title,subtitle,action,children}) {
 return <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">{title}</h3>{subtitle&&<p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>}</div>{action}</div>{children}</section>
}
export default function Overview() {
 const user=useAuthGuard()
 const [sessions,setSessions]=useState(null)
 const [runtime,setRuntime]=useState(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const [s,r]=await Promise.all([api.listSessions(),api.runtime()])
   setSessions(Array.isArray(s.sessions)?s.sessions:[])
   setRuntime(r)
  }catch(e){setError(e.message||'Dashboard information could not be loaded.')}
  finally{setBusy(false)}
 },[])
 useEffect(()=>{if(!user)return;load();const timer=setInterval(load,30000);return()=>clearInterval(timer)},[user,load])
 const stats=useMemo(()=>{
  const rows=sessions||[]
  const online=rows.filter(s=>String(s.status).toLowerCase()==='online').length
  const pairing=rows.filter(s=>['pairing','starting','connecting','reconnecting','qr','pending'].includes(String(s.status).toLowerCase())).length
  const offline=rows.length-online-pairing
  return {total:rows.length,online,pairing,offline:Math.max(0,offline)}
 },[sessions])
 if(user===undefined)return <Layout title="Dashboard"><p className="text-sm text-slate-500">Opening your workspace…</p></Layout>
 const uptime=runtime&&Number.isFinite(Number(runtime.uptime_seconds))?Math.floor(runtime.uptime_seconds/3600)+'h '+Math.floor(runtime.uptime_seconds%3600/60)+'m':'Not reported'
 const activity=(sessions||[]).filter(s=>s.last_seen_at).sort((a,b)=>new Date(b.last_seen_at)-new Date(a.last_seen_at)).slice(0,5)
 return <Layout title="Dashboard">
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-700">WANNA-CRY THANXIEE · CONTROL CENTRE</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Good day, {user?.is_owner?'Admin':'Guest'}</h2><p className="mt-1 text-sm text-slate-500">Your WhatsApp bot workspace at a glance.</p></div><button onClick={load} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-emerald-400 disabled:opacity-50">{busy?'Refreshing…':'↻ Refresh'}</button></div>
  <section className="relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#063b30] via-[#08734f] to-[#10a36a] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-6">
   <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="max-w-2xl"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-100">WHATSAPP BOT · MULTI-SESSION DASHBOARD</p><h3 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">WANNA-CRY THANXIEE</h3><p className="mt-2 max-w-lg text-sm text-emerald-50/90">Connect your WhatsApp number, monitor your sessions and manage bot tools from one workspace.</p><Link href="/pair" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-800 shadow-sm transition hover:bg-emerald-50">↗ Start pairing <span>→</span></Link></div><div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-5xl sm:flex">☏</div></div>
  </section>
  {error&&<div role="alert" aria-live="polite" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><div><p className="font-bold">Dashboard data unavailable</p><p className="mt-1 text-xs">{error}</p><p className="mt-1 text-xs text-rose-700">Your WhatsApp sessions have not been changed.</p></div><button onClick={load} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-800">Retry</button></div>}
  <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
   <Metric label="Total sessions" value={sessions===null?'—':stats.total} note="Registered WhatsApp devices" icon="▣" tone="green"/>
   <Metric label="Online" value={sessions===null?'—':stats.online} note="Connected and running" icon="◉" tone="blue"/>
   <Metric label="Offline" value={sessions===null?'—':stats.offline} note="Not currently connected" icon="◌" tone="purple"/>
   <Metric label="Pairing" value={sessions===null?'—':stats.pairing} note="Connection in progress" icon="↗" tone="pink"/>
  </div>
  <div className="mb-5 grid gap-4 xl:grid-cols-[.95fr_1.25fr_.95fr]">
   <Panel title="Session overview" subtitle="Live connection status">
    {sessions===null?<p className="py-10 text-center text-xs text-slate-400">Loading session data…</p>:<div className="flex flex-wrap items-center justify-center gap-5 py-2"><div className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{background:stats.total?'conic-gradient(#16a34a 0 '+(stats.online/stats.total*100)+'%, #2563eb '+(stats.online/stats.total*100)+'% '+((stats.online+stats.pairing)/stats.total*100)+'%, #a78bfa '+((stats.online+stats.pairing)/stats.total*100)+'% 100%)':'#e2e8f0'}}><div className="grid h-24 w-24 place-items-center rounded-full bg-white"><div className="text-center"><p className="text-2xl font-extrabold text-slate-900">{stats.total}</p><p className="text-[9px] font-semibold uppercase text-slate-400">Total</p></div></div></div><div className="space-y-3 text-xs">{[['Online',stats.online,'bg-emerald-500'],['Pairing',stats.pairing,'bg-blue-500'],['Offline',stats.offline,'bg-violet-400']].map(([name,n,color])=><div key={name} className="flex items-center gap-2"><span className={'h-2.5 w-2.5 rounded-full '+color}/><span className="w-16 text-slate-500">{name}</span><strong className="text-slate-800">{n}</strong></div>)}</div></div>}
   </Panel>
   <Panel title="Recent session activity" subtitle="Latest activity timestamps returned by the bot" action={<Link href="/sessions" className="text-[11px] font-bold text-emerald-700">View all →</Link>}>
    {sessions===null?<p className="py-8 text-center text-xs text-slate-400">Loading activity…</p>:activity.length?<div className="divide-y divide-slate-100">{activity.map(s=><div key={s.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{s.label||'+'+s.phone_number}</p><p className="mt-1 text-[10px] text-slate-400">{new Date(s.last_seen_at).toLocaleString()}</p></div><span className={'shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold capitalize '+(s.status==='online'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600')}>{s.status||'unknown'}</span></div>)}</div>:<div className="py-8 text-center"><p className="text-xs font-semibold text-slate-700">No activity records yet</p><p className="mt-1 text-[10px] text-slate-400">Activity appears when the backend reports a session timestamp.</p></div>}
   </Panel>
   <Panel title="Quick actions" subtitle="Bot management shortcuts">
    <div className="space-y-2">{[{href:'/pair',icon:'↗',title:'Pair a number',desc:'Connect WhatsApp'},{href:'/sessions',icon:'▣',title:'Manage sessions',desc:'Restart or disconnect'},{href:'/chat',icon:'☏',title:'Chat centre',desc:'Read and reply'},{href:'/servers',icon:'◈',title:'Server information',desc:'Runtime details'},{href:'/settings',icon:'⚙',title:'Bot settings',desc:'Preferences and resources'}].map(a=><Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50/60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-lg text-emerald-700">{a.icon}</span><span className="min-w-0"><span className="block text-xs font-bold text-slate-800">{a.title}</span><span className="mt-0.5 block text-[10px] text-slate-500">{a.desc}</span></span><span className="ml-auto text-slate-300">›</span></Link>)}</div>
   </Panel>
  </div>
  <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
   <Panel title="Recent WhatsApp sessions" subtitle="Devices connected to WANNA-CRY THANXIEE" action={<Link href="/sessions" className="text-[11px] font-bold text-emerald-700">All sessions →</Link>}>
    {sessions===null?<p className="py-6 text-xs text-slate-400">Loading sessions…</p>:sessions.length?<div className="divide-y divide-slate-100">{sessions.slice(0,5).map(s=><Link key={s.id} href={'/sessions/'+encodeURIComponent(s.id)} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-xs font-black text-emerald-700">WA</span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{s.label||'+'+s.phone_number}</p><p className="mt-1 text-[10px] text-slate-400">+{s.phone_number||'Number unavailable'}</p></div></div><span className={'shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold capitalize '+(s.status==='online'?'bg-emerald-50 text-emerald-700':s.status==='pairing'?'bg-blue-50 text-blue-700':'bg-slate-100 text-slate-600')}>{s.status||'unknown'}</span></Link>)}</div>:<div className="py-7 text-center"><p className="text-sm font-bold text-slate-800">No WhatsApp sessions yet</p><p className="mt-1 text-xs text-slate-500">Pair your first number to get started.</p><Link href="/pair" className="mt-3 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white">Connect WhatsApp</Link></div>}
   </Panel>
   <Panel title="Bot service" subtitle="Backend-reported runtime information">
    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3"><span className={'h-2.5 w-2.5 rounded-full '+(runtime?'bg-emerald-500':'bg-amber-500')}/><div><p className="text-xs font-bold text-slate-800">{runtime?'Runtime information received':'Runtime information unavailable'}</p><p className="mt-1 text-[10px] text-slate-500">No fabricated service status is shown.</p></div></div>
    {runtime&&<div className="mt-3 space-y-2 text-xs">{[['Platform',runtime.platform||runtime.provider||'Not reported'],['Node.js',runtime.node||'Not reported'],['Active workers',runtime.active_workers??runtime.active_bot_processes??'Not reported'],['Process uptime',uptime]].map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-2"><span className="text-slate-500">{k}</span><strong className="text-right text-slate-800">{v}</strong></div>)}</div>}
    <Link href="/servers" className="mt-4 inline-flex text-[11px] font-bold text-emerald-700">View server details →</Link>
   </Panel>
  </div>
 </Layout>
}
