import { useCallback, useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

export default function FindUsersPage() {
  const user = useAuthGuard()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (term='') => {
    setLoading(true); setError('')
    try { const result = await api.communityUsers(term); setUsers(result.users || []) }
    catch (err) { setError(err.message || 'Could not find users.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { if (user) load('') }, [user, load])
  function submit(e) { e.preventDefault(); load(query.trim()) }
  return <Layout title="Find users">
    <div className="mx-auto max-w-4xl">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Community</p><h2 className="mt-1 text-3xl font-extrabold text-slate-900">Find users</h2><p className="mt-2 text-sm text-slate-500">Discover people currently using the WANNA-CRY THANXIEE dashboard.</p></div>
      <form onSubmit={submit} className="mb-5 flex gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search display name or member type…" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"/><button disabled={loading} className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{loading?'Searching…':'Search'}</button></form>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-bold text-slate-800">Community members</h3><span className="text-xs text-slate-400">{users.length} found</span></div>
        {loading && !users.length ? <p className="p-6 text-sm text-slate-500">Loading members…</p> : users.length ? <div className="divide-y divide-slate-100">{users.map(member=><div key={member.id} className="flex items-center gap-3 p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-800">{String(member.display_name||'U').slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{member.display_name}</p><p className="mt-0.5 text-xs text-slate-500">{member.role}{member.joined_at?' · Joined '+new Date(member.joined_at).toLocaleDateString():''}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">Dashboard user</span></div>)}</div> : <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-700">No matching users</p><p className="mt-1 text-xs text-slate-500">Try another search. New members appear here when they visit the dashboard.</p></div>}
      </section>
      <p className="mt-3 text-xs text-slate-400">Private details such as email addresses and phone numbers are not shown in this directory.</p>
    </div>
  </Layout>
}
