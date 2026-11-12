import { useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { api } from '../../lib/api'

const FEATURES = {
  advertising: { title: 'Advertising', icon: '◈', status: 'Coming Soon', detail: 'Advertising tools are not available yet. This module will be enabled after campaign management and advertiser services are integrated.', items: ['Campaign creation','Advertiser management','Ad placements','Campaign analytics'] },
  chat: { title: 'Chat Centre', icon: '◌', status: 'Coming Soon', detail: 'The dashboard inbox, conversation history and live replies are being prepared. WhatsApp messaging remains available directly in your connected WhatsApp chats.', items: ['Unified conversation inbox','Search and filters','Message delivery indicators','Secure replies from connected sessions'] },
  polls: { title: 'Polls & Channels', icon: '▤', status: 'Coming Soon', detail: 'The dashboard poll builder and channel management tools are planned for a future release. Existing WhatsApp group controls continue to work through supported bot commands.', items: ['Visual poll builder','Poll results and voting summaries','WhatsApp channel publishing','Scheduled announcements'] },
  vip: { title: 'VIP Centre', icon: '♛', status: 'Supporter verification', detail: 'VIP unlock keys are issued by the owner. To qualify for a supporter OTP, use your own GitHub account to STAR and FORK the official repository. Both actions are checked against GitHub before a code is issued.', items: ['Step 1 · Star the official repository','Step 2 · Fork the official repository','Step 3 · Verify your GitHub username here','Step 4 · Send your one-time code to the owner','Step 5 · Contact the owner to request a VIP unlock key'], commands: ['.vipmenu — owner VIP console','.genpass 1h|24h|7d — owner generates a temporary passlock','.vipunlock <passlock> — owner unlocks the protected console','.passinfo — owner checks unlock status','.revokepass — owner revokes a passlock','.viplock — owner locks VIP controls','.vipaudit — owner reviews security events'] },
  media: { title: 'Media Tools', icon: '▧', status: 'Bot commands available', detail: 'Media utilities run through the WhatsApp bot command registry. Send a supported command to the bot with the relevant media attached or URL supplied.', items: ['Download and conversion commands','Sticker tools','Image utilities','Text extraction and OCR'], commands: ['.downloadmenu',' .sticker',' .removebg',' .ocr',' .video',' .instagram'] },
  help: { title: 'FAQ & Help', icon: '?', status: 'Help resources available', detail: 'Use the verified project resources and common bot commands. Never share your WhatsApp pairing code, session files or account password with anyone.', items: ['Pairing: WhatsApp → Settings → Linked Devices → Link a device','Enter the pairing code on your phone','Check API and bot health','Use the official channel for project announcements'], commands: ['.menu',' .allmenu',' .alive',' .ping',' .health',' .reportbug'] },
  payments: { title: 'Payments & Billing', icon: '＄', status: 'Coming Soon', detail: 'Payment processing, invoices, subscriptions and billing history are not active yet. No payment is being collected through this dashboard.', items: ['Secure payment gateway','Invoices and receipts','Subscription billing','Payment history and reconciliation'] },
  owner: { title: 'Owner Panel', icon: '♛', status: 'Owner only', detail: 'Open the secure owner workspace to review platform health and registered accounts. Sign in with the configured owner email.', items: ['Owner-only access','Account overview','System readiness','Infrastructure and session shortcuts'] }
}
async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
  const field = document.createElement('textarea')
  field.value = value; field.style.position = 'fixed'; field.style.opacity = '0'
  document.body.appendChild(field); field.select()
  const ok = document.execCommand('copy'); field.remove()
  if (!ok) throw new Error('Clipboard access is unavailable in this browser.')
}
export default function FeaturePage() {
  const user = useAuthGuard()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [githubUsername, setGithubUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const feature = FEATURES[router.query.slug] || null
  const commands = useMemo(() => (feature?.commands || []).map(value => value.trim()).filter(value => value.toLowerCase().includes(query.toLowerCase())), [feature, query])
  if (!user || !router.isReady) return null
  if (!feature) return <Layout title="Feature not found"><div className="rounded-2xl border border-white/10 bg-[#10182b] p-6"><h2 className="text-lg font-bold">Feature not found</h2><Link href="/overview" className="mt-4 inline-block text-sm text-violet-300">Return to dashboard</Link></div></Layout>
  const available = feature.status.includes('available') || feature.status.includes('commands') || feature.status.includes('Supporter verification')
  async function verifySupport() {
    setVerifying(true); setNotice(''); setOtp('')
    try { const result = await api.verifySupporter(githubUsername.trim()); setOtp(result.otp); setNotice(result.message) }
    catch (error) { setNotice(error.message || 'GitHub verification failed.') }
    finally { setVerifying(false) }
  }
  async function copy(value) {
    try { await copyText(value); setNotice('Copied ' + value.trim() + ' to clipboard.') }
    catch (error) { setNotice(error.message) }
  }
  return <Layout title={feature.title}>
    <div className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Platform module</p><h2 className="mt-2 text-2xl font-bold text-white">{feature.icon} {feature.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{feature.detail}</p></div>
    <section className="max-w-4xl rounded-2xl border border-white/[.08] bg-[#10182b] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-400">Integration status</p><p className="mt-1 text-lg font-bold text-white">{feature.status}</p></div><span className={'rounded-full px-3 py-1.5 text-[10px] font-bold ' + (available ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>{available ? 'AVAILABLE' : 'INFORMATION'}</span></div>
      {router.query.slug === 'vip' && <div className="mt-6 rounded-2xl border border-violet-400/20 bg-violet-500/[.06] p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white">Verify GitHub supporter status</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">Your account must both star and fork the official repository. GitHub is checked live. OTP is issued only when both checks pass.</p>
        <a href="https://github.com/Codezerox145/wanna-crythanxie-v4145" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-violet-200">Open official GitHub repository ↗</a>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={githubUsername} onChange={e=>setGithubUsername(e.target.value)} placeholder="Your GitHub username" aria-label="GitHub username" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0b1222] px-3 py-3 text-sm text-white outline-none focus:border-violet-400" /><button disabled={verifying || !githubUsername.trim()} onClick={verifySupport} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{verifying ? 'Verifying…' : 'Verify & get OTP'}</button></div>
        {otp && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Your one-time supporter code</p><p className="my-2 font-mono text-3xl font-black tracking-[.25em] text-white">{otp}</p><p className="text-xs text-slate-300">Valid for 10 minutes. Share this code with the owner to request a VIP unlock key.</p><button onClick={()=>copy(otp)} className="mt-3 rounded-lg border border-emerald-400/20 px-3 py-2 text-xs font-bold text-emerald-200">Copy OTP</button></div>}
        <a href="https://wa.me/263780706629?text=Hello%20THANXIE%20DEV%2C%20I%20have%20completed%20the%20GitHub%20supporter%20verification%20and%20would%20like%20to%20request%20a%20VIP%20unlock%20key." target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-violet-300">Contact THANXIE DEV on WhatsApp ↗</a>
      </div>}
      {feature.commands && <div className="mt-6 border-t border-white/[.07] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-white">WhatsApp command shortcuts</h3><p className="mt-1 text-xs text-slate-500">Copy a command, then send it to your connected bot in WhatsApp.</p></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter commands" aria-label="Filter commands" className="w-full rounded-lg border border-white/10 bg-[#0b1222] px-3 py-2 text-xs text-white outline-none focus:border-violet-400 sm:w-48" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{commands.map(command => <div key={command} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-[#0b1222] px-3 py-3"><code className="text-sm font-bold text-violet-200">{command}</code><button onClick={() => copy(command)} className="rounded-lg border border-violet-400/20 px-3 py-1.5 text-[11px] font-bold text-violet-200 hover:bg-violet-500/10">Copy</button></div>)}{!commands.length && <p className="col-span-full py-4 text-center text-xs text-slate-500">No matching commands.</p>}</div></div>}
      {feature.checklist && <div className="mt-6 border-t border-white/[.07] pt-5"><h3 className="text-sm font-bold text-white">Integration checklist</h3><ol className="mt-3 space-y-3">{feature.checklist.map((item,index) => <li key={item} className="flex items-start gap-3 text-sm text-slate-300"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-[11px] font-bold text-violet-200">{index+1}</span>{item}</li>)}</ol><button onClick={() => copy(feature.title + ' integration checklist:\n' + feature.checklist.map((item,index) => (index+1)+'. '+item).join('\n'))} className="mt-4 rounded-xl border border-violet-400/20 px-4 py-2.5 text-xs font-bold text-violet-200 hover:bg-violet-500/10">Copy setup checklist</button></div>}
      {notice && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">{notice}</p>}
      <div className="mt-6 border-t border-white/[.07] pt-5"><h3 className="text-sm font-bold text-white">Module scope</h3><ul className="mt-3 grid gap-3 sm:grid-cols-2">{feature.items.map(item => <li key={item} className="flex items-start gap-3 rounded-xl bg-[#0b1222] p-3 text-sm text-slate-300"><span className="text-violet-300">•</span>{item}</li>)}</ul></div>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/sessions" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5">Manage WhatsApp sessions</Link><Link href="/settings" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5">Open settings</Link><Link href="/overview" className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white">← Dashboard</Link></div>
      <p className="mt-5 text-[11px] leading-5 text-slate-500">Only connected API features and registered bot commands are shown as available. Provider-dependent services remain clearly marked until their integrations are configured.</p>
    </section>
  </Layout>
}
}
async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value)
  const field = document.createElement('textarea')
  field.value = value; field.style.position = 'fixed'; field.style.opacity = '0'
  document.body.appendChild(field); field.select()
  const ok = document.execCommand('copy'); field.remove()
  if (!ok) throw new Error('Clipboard access is unavailable in this browser.')
}
export default function FeaturePage() {
  const user = useAuthGuard()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const feature = FEATURES[router.query.slug] || null
  const commands = useMemo(() => (feature?.commands || []).map(value => value.trim()).filter(value => value.toLowerCase().includes(query.toLowerCase())), [feature, query])
  if (!user || !router.isReady) return null
  if (!feature) return <Layout title="Feature not found"><div className="rounded-2xl border border-white/10 bg-[#10182b] p-6"><h2 className="text-lg font-bold">Feature not found</h2><Link href="/overview" className="mt-4 inline-block text-sm text-violet-300">Return to dashboard</Link></div></Layout>
  const available = feature.status.includes('available') || feature.status.includes('commands')
  async function copy(value) {
    try { await copyText(value); setNotice('Copied ' + value.trim() + ' to clipboard.') }
    catch (error) { setNotice(error.message) }
  }
  return <Layout title={feature.title}>
    <div className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Platform module</p><h2 className="mt-2 text-2xl font-bold text-white">{feature.icon} {feature.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{feature.detail}</p></div>
    <section className="max-w-4xl rounded-2xl border border-white/[.08] bg-[#10182b] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-400">Integration status</p><p className="mt-1 text-lg font-bold text-white">{feature.status}</p></div><span className={'rounded-full px-3 py-1.5 text-[10px] font-bold ' + (available ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>{available ? 'AVAILABLE' : 'SETUP REQUIRED'}</span></div>
      {feature.commands && <div className="mt-6 border-t border-white/[.07] pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-white">WhatsApp command shortcuts</h3><p className="mt-1 text-xs text-slate-500">Copy a command, then send it to your connected bot in WhatsApp.</p></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter commands" aria-label="Filter commands" className="w-full rounded-lg border border-white/10 bg-[#0b1222] px-3 py-2 text-xs text-white outline-none focus:border-violet-400 sm:w-48" /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{commands.map(command => <div key={command} className="flex items-center justify-between gap-3 rounded-xl border border-white/[.07] bg-[#0b1222] px-3 py-3"><code className="text-sm font-bold text-violet-200">{command}</code><button onClick={() => copy(command)} className="rounded-lg border border-violet-400/20 px-3 py-1.5 text-[11px] font-bold text-violet-200 hover:bg-violet-500/10">Copy</button></div>)}{!commands.length && <p className="col-span-full py-4 text-center text-xs text-slate-500">No matching commands.</p>}</div></div>}
      {feature.checklist && <div className="mt-6 border-t border-white/[.07] pt-5"><h3 className="text-sm font-bold text-white">Integration checklist</h3><ol className="mt-3 space-y-3">{feature.checklist.map((item,index) => <li key={item} className="flex items-start gap-3 text-sm text-slate-300"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-[11px] font-bold text-violet-200">{index+1}</span>{item}</li>)}</ol><button onClick={() => copy(feature.title + ' integration checklist:\n' + feature.checklist.map((item,index) => (index+1)+'. '+item).join('\n'))} className="mt-4 rounded-xl border border-violet-400/20 px-4 py-2.5 text-xs font-bold text-violet-200 hover:bg-violet-500/10">Copy setup checklist</button></div>}
      {notice && <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs text-violet-100">{notice}</p>}
      <div className="mt-6 border-t border-white/[.07] pt-5"><h3 className="text-sm font-bold text-white">Module scope</h3><ul className="mt-3 grid gap-3 sm:grid-cols-2">{feature.items.map(item => <li key={item} className="flex items-start gap-3 rounded-xl bg-[#0b1222] p-3 text-sm text-slate-300"><span className="text-violet-300">•</span>{item}</li>)}</ul></div>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/sessions" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5">Manage WhatsApp sessions</Link><Link href="/settings" className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/5">Open settings</Link><Link href="/overview" className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white">← Dashboard</Link></div>
      <p className="mt-5 text-[11px] leading-5 text-slate-500">Only connected API features and registered bot commands are shown as available. Provider-dependent services remain clearly marked until their integrations are configured.</p>
    </section>
  </Layout>
}
