import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import Link from 'next/link'
import { useRouter } from 'next/router'

const FEATURES = {
  advertising: { title: 'Advertising', icon: '◈', status: 'Not configured', detail: 'Campaign creation, advertiser accounts, placements and campaign analytics need a dedicated advertising service and storage.' , items: ['Campaign management','Advertiser profiles','Ad placements and schedules','Impressions and performance reporting'] },
  chat: { title: 'Chat Centre', icon: '◌', status: 'Not configured', detail: 'A secure dashboard inbox is not currently exposed by the backend. This page does not fabricate conversations or message history.', items: ['Conversation inbox','Search and filters','Message status','Session-based replies'] },
  polls: { title: 'Polls & Channels', icon: '▤', status: 'Bot commands available', detail: 'Poll and channel actions are handled through WhatsApp bot commands. A dashboard management API is not yet connected.', items: ['WhatsApp poll commands','Channel tools','Poll management interface'] },
  vip: { title: 'VIP Centre', icon: '♛', status: 'Not configured', detail: 'VIP membership, entitlement checks and billing are not currently connected to this dashboard.', items: ['Membership plans','Entitlement status','Renewals and expiry','VIP activity'] },
  media: { title: 'Media Tools', icon: '▧', status: 'Bot commands available', detail: 'Media utilities are accessed through the WhatsApp bot command registry. This deployment does not yet provide a dashboard media job API.', items: ['Download and conversion commands','Sticker tools','Image and video utilities','Job history (not connected)'] },
  help: { title: 'FAQ & Help', icon: '?', status: 'Help resources', detail: 'Use these verified project resources for support. For safety, never share your WhatsApp pairing code or account password with anyone.', items: ['Pairing: WhatsApp → Settings → Linked Devices → Link a device','Use the pairing-code page while linking a new device','Keep your Render environment secrets private','Use the official channel for project announcements'] },
  payments: { title: 'Payments', icon: '$', status: 'Not configured', detail: 'No payment processor or billing ledger is connected to this dashboard. No payment status or revenue totals are displayed until a provider is integrated.', items: ['Payment gateway connection','Invoices and receipts','Subscription status','Payment history'] },
  owner: { title: 'Owner Panel', icon: '♜', status: 'Restricted / not configured', detail: 'Platform-wide administration requires a separately authorised owner role and admin API. A normal account cannot access privileged operations.', items: ['User administration','Plans and entitlements','Service health and audit logs','Security and platform configuration'] }
}
export default function FeaturePage() {
  const user = useAuthGuard()
  const router = useRouter()
  const feature = FEATURES[router.query.slug] || null
  if (!user) return null
  if (!router.isReady) return null
  if (!feature) return <Layout title="Feature not found"><div className="rounded-2xl border border-white/10 bg-[#10182b] p-6"><h2 className="text-lg font-bold">Feature not found</h2><Link href="/overview" className="mt-4 inline-block text-sm text-violet-300">Return to dashboard</Link></div></Layout>
  const ready = feature.status === 'Help resources' || feature.status === 'Bot commands available'
  return <Layout title={feature.title}>
    <div className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-400">Platform module</p><h2 className="mt-2 text-2xl font-bold text-white">{feature.icon} {feature.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{feature.detail}</p></div>
    <section className="max-w-3xl rounded-2xl border border-white/[.08] bg-[#10182b] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-slate-400">Integration status</p><p className="mt-1 text-lg font-bold text-white">{feature.status}</p></div><span className={'rounded-full px-3 py-1.5 text-[10px] font-bold ' + (ready ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>{ready ? 'PARTIALLY AVAILABLE' : 'INTEGRATION REQUIRED'}</span></div>
      <div className="mt-5 border-t border-white/[.07] pt-5"><h3 className="text-sm font-bold text-white">Module scope</h3><ul className="mt-3 space-y-3">{feature.items.map(item => <li key={item} className="flex items-start gap-3 text-sm text-slate-300"><span className="mt-0.5 text-violet-300">•</span>{item}</li>)}</ul></div>
      <div className="mt-6 rounded-xl border border-violet-400/15 bg-violet-500/[.06] p-4"><p className="text-xs leading-5 text-slate-300">This module is shown in the navigation so its availability is transparent. It will not display sample users, fake transactions or simulated activity as real account data.</p></div>
      <Link href="/overview" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-xs font-bold text-white">← Back to dashboard</Link>
    </section>
  </Layout>
}
