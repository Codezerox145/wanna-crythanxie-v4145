import { useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import Link from 'next/link'
import { useRouter } from 'next/router'

const FEATURES = {
  advertising: { title: 'Advertising', icon: '◈', status: 'Integration required', detail: 'Campaign creation, advertiser accounts, placements and campaign analytics need a dedicated advertising service and persistent campaign storage.', items: ['Campaign management','Advertiser profiles','Ad placements and schedules','Impressions and performance reporting'], checklist: ['Choose an advertising provider or define the in-house campaign model','Create advertiser and campaign data models','Add moderation, scheduling and impression tracking','Connect campaign analytics and payment reconciliation'] },
  chat: { title: 'Chat Centre', icon: '◌', status: 'Integration required', detail: 'A secure dashboard inbox is not currently exposed by the backend. WhatsApp session management is available, but message history and dashboard replies are not yet implemented.', items: ['Conversation inbox','Search and filters','Message status','Session-based replies'], checklist: ['Persist incoming and outgoing message events per session','Add an authenticated conversation API with pagination','Add send-message endpoints with session ownership checks','Add delivery status, unread counts and retention controls'] },
  polls: { title: 'Polls & Channels', icon: '▤', status: 'Bot commands available', detail: 'Use these registered WhatsApp bot commands in a group or channel where the bot has the required permissions.', items: ['Create group polls','Manage WhatsApp channel posts','Inspect channel information','Use bot commands directly from WhatsApp'], commands: ['.poll',' .channelmenu',' .channelpost',' .channelinfo',' .channelstats'] },
  vip: { title: 'VIP Centre', icon: '♛', status: 'Integration required', detail: 'VIP commands exist in the WhatsApp bot, but the dashboard does not yet have a subscription ledger or entitlement management API.', items: ['Membership plans','Entitlement status','Renewals and expiry','VIP activity'], commands: ['.vipmenu',' .vipstatus',' .viplist'], checklist: ['Define subscription plans and entitlement rules','Connect a verified payment provider','Persist invoices, renewals and expiry dates','Expose authenticated account and owner administration APIs'] },
  media: { title: 'Media Tools', icon: '▧', status: 'Bot commands available', detail: 'Media utilities run through the WhatsApp bot command registry. Send a supported command to the bot with the relevant media attached or URL supplied.', items: ['Download and conversion commands','Sticker tools','Image utilities','Text extraction and OCR'], commands: ['.downloadmenu',' .sticker',' .removebg',' .ocr',' .video',' .instagram'] },
  help: { title: 'FAQ & Help', icon: '?', status: 'Help resources available', detail: 'Use the verified project resources and common bot commands. Never share your WhatsApp pairing code, session files or account password with anyone.', items: ['Pairing: WhatsApp → Settings → Linked Devices → Link a device','Enter the pairing code on your phone','Check API and bot health','Use the official channel for project announcements'], commands: ['.menu',' .allmenu',' .alive',' .ping',' .health',' .reportbug'] },
  payments: { title: 'Payments', icon: '$', status: 'Integration required', detail: 'No payment processor or billing ledger is connected to this dashboard. No payment status, invoices or revenue totals are fabricated.', items: ['Payment gateway connection','Invoices and receipts','Subscription status','Payment history'], checklist: ['Select and configure a supported payment gateway','Implement signed payment callbacks and idempotency','Persist payment intents, receipts and refunds','Add reconciliation, audit logs and owner-only controls'] },
  owner: { title: 'Owner Panel', icon: '♜', status: 'Restricted', detail: 'Platform-wide administration requires a separately authorised owner role and admin API. A standard dashboard account cannot access privileged operations.', items: ['User administration','Plans and entitlements','Service health and audit logs','Security and platform configuration'], commands: ['.owner',' .botstats',' .runtime',' .logs'], checklist: ['Define owner identity and role-based access rules','Add admin API endpoints with audit logging','Add user, plan and entitlement management','Protect destructive actions with confirmation and re-authentication'] }
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
