import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import { api } from '../../lib/api'

const FALLBACK_COUNTRIES = [
  { code: '+263', label: 'Zimbabwe (+263)' }, { code: '+27', label: 'South Africa (+27)' },
  { code: '+234', label: 'Nigeria (+234)' }, { code: '+254', label: 'Kenya (+254)' },
  { code: '+1', label: 'United States (+1)' }, { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+91', label: 'India (+91)' }
]
const REGIONS = [
  { value: 'auto', label: 'Automatic routing (recommended)' }, { value: 'africa', label: 'Africa' },
  { value: 'europe', label: 'Europe' }, { value: 'north_america', label: 'North America' },
  { value: 'south_america', label: 'South America' }, { value: 'asia_pacific', label: 'Asia-Pacific' },
  { value: 'middle_east', label: 'Middle East' }, { value: 'backup', label: 'Backup / failover' }
]

export default function Pair() {
  const user = useAuthGuard()
  const router = useRouter()
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES)
  const [countryCode, setCountryCode] = useState('+263')
  const [number, setNumber] = useState('')
  const [region, setRegion] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd')
      .then(r => { if (!r.ok) throw new Error('Country list unavailable'); return r.json() })
      .then(data => {
        const list = data.flatMap(c => {
          const root = c.idd?.root || ''
          const suffixes = c.idd?.suffixes || []
          if (!root || !suffixes.length) return []
          return suffixes.map(s => ({ code: root + s, label: `${c.name?.common || c.cca2} (${root + s})` }))
        }).filter(c => /^\+\d{1,4}$/.test(c.code))
        const unique = Array.from(new Map(list.map(c => [c.code + c.label, c])).values()).sort((a,b) => a.label.localeCompare(b.label))
        if (active && unique.length) setCountries(unique)
      }).catch(() => {})
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => countries.filter(c => (c.label + ' ' + c.code).toLowerCase().includes(query.toLowerCase())).slice(0, 120), [countries, query])
  if (user === undefined) return <Layout title="Workspace"><div className="grid min-h-64 place-items-center text-sm text-slate-500">Opening your workspace…</div></Layout>

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    let digits = number.replace(/\D/g, '')
    const dial = countryCode.replace(/\D/g, '')
    if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
    if (digits.startsWith(dial)) digits = digits.slice(dial.length)
    if (!digits || !/^\d{1,4}$/.test(dial) || (dial + digits).length < 8 || (dial + digits).length > 15) {
      setError('Enter a valid WhatsApp number. Include the local number only; the country code is added automatically.')
      return
    }
    setLoading(true)
    try {
      const { sessionId } = await api.createSession(dial + digits, region, '')
      router.push(`/pair/${sessionId}`)
    } catch (err) {
      setError(err.message || 'We could not start pairing. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return <Layout title="Pair a number">
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-950 to-indigo-900 p-5 text-white sm:p-6"><p className="text-xs uppercase tracking-[.2em] text-indigo-200">Secure device linking</p><h2 className="mt-1 text-xl font-bold text-white">Connect WhatsApp</h2><p className="mt-1 text-sm text-slate-300">Choose a country, enter your number and request a fresh pairing code.</p></div>
      <form onSubmit={handleSubmit} className="form-light space-y-5 p-5 sm:p-6">
        <div><label htmlFor="country-search" className="mb-1.5 block text-sm font-semibold text-slate-800">Find your country</label><input id="country-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search country or calling code" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400" /></div>
        <div><label htmlFor="country-code" className="mb-1.5 block text-sm font-semibold text-slate-800">Country calling code</label><select id="country-code" value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900">{filtered.map((c,i) => <option key={c.label + i} value={c.code}>{c.label}</option>)}</select></div>
        <div><label htmlFor="phone-number" className="mb-1.5 block text-sm font-semibold text-slate-800">WhatsApp phone number</label><input id="phone-number" value={number} onChange={e => setNumber(e.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="771 909 006" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400" /><p className="mt-1.5 text-xs text-slate-600">Enter the number without the country calling code.</p></div>
        <div><label htmlFor="server-region" className="mb-1.5 block text-sm font-semibold text-slate-800">Preferred server region</label><select id="server-region" value={region} onChange={e => setRegion(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900">{REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select><p className="mt-1.5 text-xs text-slate-600">This is a routing preference. Only configured servers can host bot workers.</p></div>
        {error && <div role="alert" aria-live="polite" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p className="font-semibold">Pairing could not start</p><p className="mt-1">{error}</p><p className="mt-2 text-xs text-rose-700">Check the number and try again. If the problem continues, contact the bot administrator.</p></div>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Requesting pairing code…' : 'Generate pairing code'}</button>
      </form>
    </div>
  </Layout>
}
