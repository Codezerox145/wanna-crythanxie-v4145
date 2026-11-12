import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'
import Link from 'next/link'

function Metric({ label, value, hint }) {
  return <div className="rounded-2xl border border-white/[.08] bg-[#10182b] p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value ?? '—'}</p>{hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}</div>
}
export default function OwnerPanel() {
  const user = useAuthGuard()
  const [data, setData] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true); setError('')
    try {
      const [overview, userList] = await Promise.all([api.ownerOverview(), api.ownerUsers()])
      setData(overview); setUsers(userList.users || [])
    } catch (e) { setError(e.message || 'Owner tools could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { if (user?.is_owner) load() }, [user])
  if (!user) return null
  if (!user.is_owner) return <Layout title="Owner Panel"><section className="mx-auto max-w-2xl rounded-2xl border border-amber-400/20 bg-[#10182b] p-6"><div className="text-3xl text-amber-300">♛</div><h2 className="mt-3 text-xl font-bold text-white">Owner access required</h2><p className="mt-2 text-sm leading-6 text-slate-400">Sign in with the owner email configured in the Render API environment variable <code>OWNER_EMAILS</code>. Normal user accounts cannot access owner tools.</p><Link href="/settings" className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-violet-200">Account settings</Link></section></Layout>
  return <Layout title="Owner Control Panel">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-300">Restricted · owner only</p><h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Owner Control Panel</h2><p className="mt-1 text-sm text-slate-400">Platform oversight, user accounts, supporter verification and service readiness.</p></div><button onClick={load} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh overview'}</button></div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}<p className="mt-1 text-xs text-rose-200/70">If you are the owner, add your exact dashboard signup email to OWNER_EMAILS on Render, then sign out and sign in again.</p></div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Registered users" value={data?.users_total}/><Metric label="Owner accounts" value={data?.owner_accounts}/><Metric label="WhatsApp sessions" value={data?.sessions_total}/><Metric label="Sessions online" value={data?.sessions_online}/><Metric label="Supporter OTPs redeemed" value={data?.supporter_verifications}/><Metric label="Pending OTPs" value={data?.pending_otps}/><Metric label="Active Baileys workers" value={data?.worker_count}/><Metric label="API uptime" value={data ? Math.floor(data.api_uptime_seconds/3600)+'h '+Math.floor(data.api_uptime_seconds%3600/60)+'m' : '—'}/></div>
    <section className="mt-5 rounded-2xl border border-white/[.08] bg-[#10182b] p-5"><h3 className="text-sm font-bold text-white">System readiness</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(data?.environment || {}).map(([key,value])=><div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-[#0b1222] p-3"><span className="text-xs text-slate-300">{key.replaceAll('_',' ')}</span><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(value?'bg-emerald-500/10 text-emerald-300':'bg-amber-500/10 text-amber-300')}>{value?'Configured':'Not configured'}</span></div>)}</div></section>
    <section className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-[#10182b]"><div className="flex items-center justify-between gap-3 border-b border-white/[.07] p-5"><div><h3 className="text-sm font-bold text-white">Dashboard accounts</h3><p className="mt-1 text-xs text-slate-500">Read-only account overview. Passwords and secrets are never exposed.</p></div><span className="text-xs text-slate-500">{users.length} accounts</span></div><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-[#0b1222] text-slate-500"><tr><th className="px-5 py-3 font-semibold">Email</th><th className="px-5 py-3 font-semibold">Role</th><th className="px-5 py-3 font-semibold">Created</th></tr></thead><tbody>{users.map(item=><tr key={item.id} className="border-t border-white/[.06]"><td className="px-5 py-3 text-slate-200">{item.email}</td><td className="px-5 py-3"><span className="rounded-full bg-violet-500/10 px-2 py-1 text-violet-200">{item.role}</span></td><td className="px-5 py-3 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!users.length && <p className="p-5 text-xs text-slate-500">No accounts are registered yet.</p>}</div></section>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><Link href="/sessions" className="rounded-xl border border-white/10 bg-[#10182b] p-4 text-sm font-bold text-white hover:border-violet-400/40">Manage WhatsApp sessions <span className="float-right text-violet-300">↗</span></Link><Link href="/servers" className="rounded-xl border border-white/10 bg-[#10182b] p-4 text-sm font-bold text-white hover:border-violet-400/40">Infrastructure registry <span className="float-right text-violet-300">↗</span></Link><Link href="/settings" className="rounded-xl border border-white/10 bg-[#10182b] p-4 text-sm font-bold text-white hover:border-violet-400/40">Runtime and configuration <span className="float-right text-violet-300">↗</span></Link><Link href="/features/vip" className="rounded-xl border border-white/10 bg-[#10182b] p-4 text-sm font-bold text-white hover:border-violet-400/40">VIP supporter requests <span className="float-right text-violet-300">↗</span></Link></div>
    <p className="mt-5 text-[11px] leading-5 text-slate-500">Administrative actions that affect payments, entitlements, secrets or user deletion are intentionally unavailable until their audited APIs are implemented. This panel does not expose environment secret values.</p>
  </Layout>
}
