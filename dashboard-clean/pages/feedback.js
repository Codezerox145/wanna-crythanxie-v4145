import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

export default function FeedbackPage() {
  const user = useAuthGuard()
  const [category, setCategory] = useState('Suggestion')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setNotice(''); setError('')
    try { const result = await api.submitFeedback(category, message); setNotice(result.message || 'Feedback submitted.'); setMessage('') }
    catch (err) { setError(err.message || 'Could not submit feedback.') }
    finally { setBusy(false) }
  }
  return <Layout title="Feedback">
    <div className="mx-auto max-w-2xl">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Help us improve</p><h2 className="mt-1 text-3xl font-extrabold text-slate-900">Send feedback</h2><p className="mt-2 text-sm text-slate-500">Report a problem, suggest a feature or tell us what could work better.</p></div>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><label className="mb-2 block text-sm font-semibold text-slate-700">Feedback type</label><select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900"><option>Suggestion</option><option>Bug report</option><option>Complaint</option><option>Other</option></select></div>
        <div><label className="mb-2 block text-sm font-semibold text-slate-700">Your message</label><textarea required minLength={8} maxLength={3000} rows={7} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what happened or what you would like us to improve…" className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"/></div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{message.length}/3000</span><button disabled={busy || message.trim().length<8} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Submitting…':'Submit feedback'}</button></div>
      </form>
    </div>
  </Layout>
}
