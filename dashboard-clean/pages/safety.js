import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

function Metric({ label, value }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[11px] font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold text-slate-900">{value ?? 0}</p></div>
}
function StatePill({ active, yes = 'Active', no = 'Paused' }) {
  return <span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800')}>{active ? yes : no}</span>
}
export default function SafetyCentre() {
  const user = useAuthGuard()
  const [mine, setMine] = useState(null)
  const [ownerData, setOwnerData] = useState(null)
  const [settings, setSettings] = useState({ min_interval_ms: 2500, max_per_minute: 20, duplicate_window_ms: 30000, max_queue: 30, pause_on_repeated_errors: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const owner = Boolean(user?.is_owner)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const me = await api.safetyMe()
      setMine(me)
      setSettings(me.account?.settings || settings)
      if (user?.is_owner) setOwnerData(await api.ownerSafety())
      else setOwnerData(null)
    } catch (e) { setError(e.message || 'Safety information could not be loaded.') }
    finally { setLoading(false) }
  }, [user?.is_owner])

  useEffect(() => { if (user) load() }, [user, load])

  async function saveSettings(e) {
    e.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const result = await api.updateSafety({
        minIntervalMs: Number(settings.min_interval_ms),
        maxPerMinute: Number(settings.max_per_minute),
        duplicateWindowMs: Number(settings.duplicate_window_ms),
        maxQueue: Number(settings.max_queue),
        pauseOnRepeatedErrors: Boolean(settings.pause_on_repeated_errors)
      })
      setMine(current => current ? { ...current, account: result.account } : current)
      setSettings(result.account.settings)
      setNotice('Your account safety settings have been saved.')
    } catch (e) { setError(e.message || 'Could not save safety settings.') }
    finally { setSaving(false) }
  }
  async function pauseMine(paused) {
    setSaving(true); setError(''); setNotice('')
    try {
      const result = paused ? await api.pauseSafety() : await api.resumeSafety()
      setMine(current => current ? { ...current, account: result.account } : current)
      setNotice(paused ? 'Outbound automation paused for your account.' : 'Your account automation has resumed.')
      if (owner) setOwnerData(await api.ownerSafety())
    } catch (e) { setError(e.message || 'Account control failed.') }
    finally { setSaving(false) }
  }
  async function globalPause(paused) {
    setSaving(true); setError(''); setNotice('')
    try {
      await api.ownerSetGlobalPause(paused)
      setOwnerData(await api.ownerSafety())
      setNotice(paused ? 'Global emergency pause enabled.' : 'Global emergency pause lifted.')
    } catch (e) { setError(e.message || 'Global safety control failed.') }
    finally { setSaving(false) }
  }
  async function setUserPause(id, paused) {
    setSaving(true); setError(''); setNotice('')
    try {
      await api.ownerSetAccountPause(id, paused)
      setOwnerData(await api.ownerSafety())
      if (id === user?.id) {
        const me = await api.safetyMe()
        setMine(me)
      }
      setNotice(paused ? 'Account automation paused.' : 'Account automation resumed.')
    } catch (e) { setError(e.message || 'Account safety control failed.') }
    finally { setSaving(false) }
  }

  if (user === undefined || loading) return <Layout title="Account Safety Centre"><div className="grid min-h-64 place-items-center text-sm text-slate-500">Loading account safety…</div></Layout>
  if (!user) return <Layout title="Account Safety Centre"><p className="rounded-xl bg-white p-5 text-sm text-slate-600">Open your workspace to manage account safety.</p></Layout>
  const account = mine?.account
  const stats = account?.stats || {}
  const isPaused = Boolean(account?.global_paused || account?.account_paused || account?.automatic_pauses?.length)
  const eventRows = owner ? (ownerData?.events || []) : (mine?.events || [])

  return <Layout title="Account Safety Centre">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-700">BAILEYS · OUTBOUND PROTECTION</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Account Safety Centre</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Independent safeguards for each paired WhatsApp account. These controls reduce accidental bursts; they cannot guarantee immunity from WhatsApp restrictions.</p></div>
      <button onClick={load} disabled={loading || saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">Refresh</button>
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}

    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{owner ? 'OWNER ACCOUNT · PERSONAL CONTROLS' : 'YOUR ACCOUNT'}</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Outbound protection</h3></div><StatePill active={!isPaused} yes="Protection running" no="Sending paused"/></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Messages accepted" value={stats.sent}/>
        <Metric label="Blocked / duplicates" value={stats.blocked}/>
        <Metric label="Send failures" value={stats.failed}/>
        <Metric label="Automatic pauses" value={stats.auto_pauses}/>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={saving || account?.account_paused} onClick={() => pauseMine(true)} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 disabled:opacity-50">Pause my automation</button>
        <button disabled={saving || (!account?.account_paused && !account?.global_paused)} onClick={() => pauseMine(false)} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Resume my account</button>
        {account?.global_paused && <p className="self-center text-[11px] text-amber-700">The owner has paused all outbound automation. Only the owner can lift the global pause.</p>}
      </div>
    </section>

    <form onSubmit={saveSettings} className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-extrabold text-slate-900">Personal sending safeguards</h3>
      <p className="mt-1 text-xs text-slate-500">Limits apply independently to all WhatsApp sessions under this dashboard account.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-700">Minimum interval between messages<select value={settings.min_interval_ms} onChange={e => setSettings(v => ({...v,min_interval_ms:Number(e.target.value)}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value={2500}>2.5 seconds</option><option value={3000}>3 seconds</option><option value={4000}>4 seconds</option><option value={5000}>5 seconds</option><option value={7500}>7.5 seconds</option><option value={10000}>10 seconds</option></select></label>
        <label className="block text-xs font-semibold text-slate-700">Maximum messages per minute<select value={settings.max_per_minute} onChange={e => setSettings(v => ({...v,max_per_minute:Number(e.target.value)}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value={4}>4 messages</option><option value={6}>6 messages</option><option value={10}>10 messages</option><option value={15}>15 messages</option><option value={20}>20 messages</option></select></label>
        <label className="block text-xs font-semibold text-slate-700">Duplicate blocking window<select value={settings.duplicate_window_ms} onChange={e => setSettings(v => ({...v,duplicate_window_ms:Number(e.target.value)}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value={10000}>10 seconds</option><option value={30000}>30 seconds</option><option value={60000}>1 minute</option><option value={120000}>2 minutes</option></select></label>
        <label className="block text-xs font-semibold text-slate-700">Queue capacity<select value={settings.max_queue} onChange={e => setSettings(v => ({...v,max_queue:Number(e.target.value)}))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"><option value={5}>5 pending messages</option><option value={10}>10 pending messages</option><option value={20}>20 pending messages</option><option value={30}>30 pending messages</option><option value={50}>50 pending messages</option></select></label>
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><input type="checkbox" checked={Boolean(settings.pause_on_repeated_errors)} onChange={e => setSettings(v => ({...v,pause_on_repeated_errors:e.target.checked}))} className="mt-0.5 h-4 w-4 accent-emerald-700"/><span><strong>Pause after repeated send failures</strong><span className="mt-1 block text-slate-500">Automatically pauses that WhatsApp session for two minutes after three consecutive send failures. No automatic retries are performed.</span></span></label>
      <div className="mt-4 flex justify-end"><button type="submit" disabled={saving} className="rounded-xl bg-emerald-700 px-5 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save safety settings'}</button></div>
    </form>

    {owner && <section className="mb-5 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-rose-700">OWNER ONLY</p><h3 className="mt-1 text-lg font-extrabold text-slate-900">Global emergency control</h3><p className="mt-1 text-xs text-slate-500">Pauses or resumes outbound automation for every account, including the owner.</p></div><StatePill active={!ownerData?.global?.paused} yes="Global sending enabled" no="Global pause active"/></div>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={saving || ownerData?.global?.paused} onClick={() => globalPause(true)} className="rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Emergency pause all accounts</button><button disabled={saving || !ownerData?.global?.paused} onClick={() => globalPause(false)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 disabled:opacity-50">Lift global pause</button></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="text-slate-500"><tr><th className="py-2 pr-3">Dashboard account</th><th className="py-2 pr-3">Role</th><th className="py-2 pr-3">Sessions</th><th className="py-2 pr-3">Safety</th><th className="py-2">Control</th></tr></thead><tbody>{(ownerData?.accounts || []).map(item=><tr key={item.id} className="border-t border-slate-100"><td className="py-3 pr-3 font-semibold text-slate-800">{item.email}</td><td className="py-3 pr-3 capitalize text-slate-500">{item.role}</td><td className="py-3 pr-3 text-slate-600">{item.sessions_online}/{item.sessions_total} online</td><td className="py-3 pr-3"><StatePill active={!item.safety.account_paused} yes="Enabled" no="Paused"/></td><td className="py-3"><button disabled={saving || item.id===user.id} onClick={() => setUserPause(item.id,!item.safety.account_paused)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700 disabled:opacity-40">{item.safety.account_paused?'Resume':'Pause'}</button></td></tr>)}</tbody></table>{!ownerData?.accounts?.length && <p className="py-4 text-xs text-slate-500">No dashboard accounts found.</p>}</div>
      <p className="mt-3 text-[10px] text-slate-500">Owner controls can pause user accounts independently. User accounts cannot inspect or control other accounts.</p>
    </section>}

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-extrabold text-slate-900">Recent safety events</h3><p className="mt-1 text-xs text-slate-500">{owner ? 'Platform-wide audit events' : 'Only events for your account'}</p></div><span className="text-[10px] text-slate-400">{eventRows.length} records</span></div>
      <div className="mt-3 divide-y divide-slate-100">{eventRows.slice(0,30).map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-xs font-bold capitalize text-slate-800">{String(item.type||'event').replaceAll('_',' ')}</p><p className="mt-1 text-[10px] text-slate-500">{item.detail}{owner && item.account_id ? ' · '+item.account_id.slice(0,8) : ''}</p></div><time className="text-[10px] text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleString() : '—'}</time></div>)}{!eventRows.length && <p className="py-6 text-center text-xs text-slate-400">No safety events recorded yet.</p>}</div>
    </section>
    <p className="mt-4 text-[10px] leading-5 text-slate-400">Baileys is an unofficial WhatsApp Web client. Rate limits and duplicate blocking help prevent accidental bursts and repeated sends, but platform restrictions can still occur. Use consent-based messaging and stop sending when WhatsApp reports a restriction.</p>
  </Layout>
}
