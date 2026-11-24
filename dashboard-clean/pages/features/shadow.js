import { useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'

const GROUPS = [
  { title: 'Reports & evidence', color: 'violet', commands: [
    ['report','◉','.report (reply/mention) <reason>','Record a group-specific report with its reason.'],
    ['reports','▤','.reports (reply/mention)','View reports recorded for a member in this group.'],
    ['viewreport','⌕','.viewreport (reply/mention) <index>','Open one report by its list number.'],
    ['reportstats','▥','.reportstats','Count members with reports in this group.'],
    ['reportlog','▧','.reportlog','Show the latest report entries.'],
    ['clearreports','⌫','.clearreports (reply/mention)','Clear reports for a selected member.'],
    ['evidence','▣','.evidence <note>','Save a group-local moderation note; media is not uploaded by this command.']
  ]},
  { title: 'Strikes & enforcement', color: 'blue', commands: [
    ['strike','⚑','.strike (reply/mention) <reason>','Save a group-local strike record; it does not auto-ban the member.'],
    ['strikes','▤','.strikes (reply/mention)','Show a member’s strike count.'],
    ['liststrikes','☷','.liststrikes (reply/mention)','List recorded strike reasons.'],
    ['clearstrikes','⌫','.clearstrikes (reply/mention)','Clear a member’s strikes.'],
    ['enforce','⬡','.enforce','Check bot admin status, active bans, blacklist, watchlist and flags.'],
    ['amnesty','✧','.amnesty (reply/mention)','Clear a member’s reports, strikes and group ban.']
  ]},
  { title: 'Group bans', color: 'rose', commands: [
    ['ban','⛔','.ban (reply/mention) <reason>','Remove the member now and add a group ban; bot admin is required.'],
    ['unban','✓','.unban (reply/mention)','Clear the group ban record; the member still needs a valid invite.'],
    ['tempban','◷','.tempban (reply/mention) <duration>','Remove now and block rejoining until expiry; a new invite is still needed.'],
    ['banhistory','▤','.banhistory','List members currently recorded as banned.'],
    ['baninfo','ⓘ','.baninfo (reply/mention)','View a member’s ban reason and details.'],
    ['reason','?','.reason (reply/mention)','Show the recorded ban reason.']
  ]},
  { title: 'Lists & flags', color: 'amber', commands: [
    ['blacklist','⊖','.blacklist (reply/mention) <reason>','Remove a current member and block future joins; bot admin is required.'],
    ['unblacklist','⊕','.unblacklist (reply/mention)','Remove a member from the group blacklist.'],
    ['listblacklist','☷','.listblacklist','View this group’s blacklist.'],
    ['watchlist','◉','.watchlist (reply/mention) <note>','Save a group-local observation note; it does not monitor or message automatically.'],
    ['unwatchlist','◎','.unwatchlist (reply/mention)','Remove a member from the watchlist.'],
    ['listwatchlist','☷','.listwatchlist','View the group watchlist.'],
    ['threatlevel','◈','.threatlevel (reply/mention)','Summarise group-local reports and strikes into a level.'],
    ['flaguser','⚑','.flaguser (reply/mention) <reason>','Save a group-local flag; it does not automatically remove the member.'],
    ['unflaguser','⚐','.unflaguser (reply/mention)','Remove a member’s group flag.']
  ]},
  { title: 'Centre', color: 'violet', commands: [
    ['shadowmenu','⌘','.shadowmenu','List all commands in this centre.']
  ]}
]
const COLORS = { violet:'border-violet-400/25 bg-violet-500/10 text-violet-200', blue:'border-blue-400/25 bg-blue-500/10 text-blue-200', rose:'border-rose-400/25 bg-rose-500/10 text-rose-200', amber:'border-amber-400/25 bg-amber-500/10 text-amber-200' }
async function copy(value) { await navigator.clipboard.writeText(value) }
export default function ShadowEnforcement() {
  const user = useAuthGuard()
  const [query,setQuery] = useState('')
  const [copied,setCopied] = useState('')
  const groups = useMemo(() => GROUPS.map(group => ({...group,commands:group.commands.filter(item => item.join(' ').toLowerCase().includes(query.toLowerCase()))})).filter(group=>group.commands.length),[query])
  if (user === undefined) return <Layout title="Workspace"><div className="grid min-h-64 place-items-center text-sm text-slate-500">Opening your workspace…</div></Layout>
  if (!user.is_owner) return <Layout title="Access restricted"><div className="rounded-2xl border border-rose-400/20 bg-[#10182b] p-6"><h2 className="font-bold text-white">Owner access required</h2><p className="mt-2 text-sm text-slate-400">This centre is restricted to the configured owner account.</p></div></Layout>
  async function copyCommand(value) { try { await copy(value); setCopied(value); setTimeout(()=>setCopied(''),1600) } catch (_) { setCopied('Clipboard unavailable') } }
  return <Layout title="Shadow Enforcement Centre">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">Owner tools</p><h2 className="mt-1 text-2xl font-bold text-white">Shadow Enforcement Centre</h2><p className="mt-1 text-xs text-slate-400">Group-specific moderation · owner and VIP gated · WhatsApp command execution</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search commands…" aria-label="Search commands" className="w-full rounded-xl border border-white/10 bg-[#0b1222] px-3 py-2.5 text-sm text-white sm:w-64"/></div>
    <div className="mb-5 flex flex-wrap gap-2"><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold text-violet-200">29 commands</span><span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-200">Immediate actions + group-local records</span></div>
    <div className="space-y-6">{groups.map(group=><section key={group.title}><h3 className="mb-3 text-sm font-bold text-white">{group.title}</h3><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{group.commands.map(([name,icon,usage,description])=><article key={name} className="rounded-2xl border border-white/[.08] bg-[#10182b] p-4 transition hover:border-violet-400/30"><div className="flex items-start gap-3"><span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-lg '+COLORS[group.color]}>{icon}</span><div className="min-w-0 flex-1"><h4 className="text-sm font-bold text-white">{name}</h4><p className="mt-1 text-xs leading-5 text-slate-400">{description}</p></div></div><div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-[#080d1c] px-3 py-2"><code className="min-w-0 break-all text-[11px] text-violet-200">{usage}</code><button onClick={()=>copyCommand(usage)} className="shrink-0 rounded-md border border-violet-400/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-200 hover:bg-violet-500/10">{copied===usage?'Copied':'Copy'}</button></div></article>)}</div></section>)}
    {groups.length===0&&<div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">No matching commands.</div>}</div>
    <p className="mt-6 text-[11px] leading-5 text-slate-500">This page is a command reference, not a remote-control panel. Commands execute in WhatsApp and records save immediately. Member removal and join-blocking require the bot to be a group admin. Reports, strikes, watchlist and flags are group-local records and do not trigger automatic punishment.</p>
  </Layout>
}
