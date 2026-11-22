import { useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

export default function RatePage() {
  const user = useAuthGuard()
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setNotice(''); setError('')
    try { const result = await api.submitRating(rating, review); setNotice(result.message || 'Thanks for your rating!') }
    catch (err) { setError(err.message || 'Could not save your rating.') }
    finally { setBusy(false) }
  }
  return <Layout title="Rate us">
    <div className="mx-auto max-w-xl">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-700">Your opinion matters</p><h2 className="mt-1 text-3xl font-extrabold text-slate-900">Rate WANNA-CRY THANXIEE</h2><p className="mt-2 text-sm text-slate-500">How is your experience with the bot and dashboard?</p></div>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Choose your rating</p>
        <div className="mt-3 flex items-center gap-2" role="group" aria-label="Star rating">{[1,2,3,4,5].map(value=><button key={value} type="button" aria-label={value+' stars'} aria-pressed={rating===value} onClick={()=>setRating(value)} className={'text-4xl transition '+(value<=rating?'text-amber-400':'text-slate-200')}>★</button>)}</div>
        <p className="mt-2 text-sm font-semibold text-slate-600">{rating} out of 5 stars</p>
        <label className="mb-2 mt-5 block text-sm font-semibold text-slate-700">Optional review</label>
        <textarea rows={4} maxLength={1000} value={review} onChange={e=>setReview(e.target.value)} placeholder="Share a few words about your experience…" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"/>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        <button disabled={busy} className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'Saving…':'Submit rating'}</button>
      </form>
    </div>
  </Layout>
}
