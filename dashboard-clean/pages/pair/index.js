import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import { api } from '../../lib/api'

const FALLBACK_COUNTRIES = [
  { code: '+263', label: '🇿🇼 Zimbabwe (+263)' }, { code: '+27', label: '🇿🇦 South Africa (+27)' },
  { code: '+234', label: '🇳🇬 Nigeria (+234)' }, { code: '+254', label: '🇰🇪 Kenya (+254)' },
  { code: '+1', label: '🇺🇸 United States (+1)' }, { code: '+44', label: '🇬🇧 United Kingdom (+44)' },
  { code: '+91', label: '🇮🇳 India (+91)' }
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
          return suffixes.map(s => ({ code: root + s, label: `${c.name?.common || c.cca2} (${root + s})`, flag: c.cca2 }))
        }).filter(c => /^\+\d{1,4}$/.test(c.code))
        const unique = Array.from(new Map(list.map(c => [c.code + c.label, c])).values()).sort((a,b) => a.label.localeCompare(b.label))
        if (active && unique.length) setCountries(unique)
      }).catch(() => {})
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => countries.filter(c => (c.label + ' ' + c.code).toLowerCase().includes(query.toLowerCase())).slice(0, 120), [countries, query])
  if (!user) return null


  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const digits = number.replace(/\D/g, '')
    const dial = countryCode.replace(/\D/g, '')
    if (!digits || !/^\d{1,4}$/.test(dial) || (dial + digits).length < 8 || (dial + digits).length > 15) {
      setError('Enter a valid international WhatsApp number (8–15 digits including country code).')
      return
    }
    setLoading(true)
    try {
      const { sessionId } = await api.createSession(dial + digits, region, '')
      router.push(`/pair/${sessionId}`)
    } catch (err) {
      setError(err.message || 'Could not start pairing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function continueToPairing() {
    if (!githubUsername.trim()) { setCommunityError('Enter your GitHub username to verify your fork and star.'); return }
    if (!communityConfirmed) { setCommunityError('Confirm that you completed both GitHub actions.'); return }
    setLoading(true); setCommunityError('')
    try {
      await api.verifySupporter(githubUsername.trim(), false)
      const { sessionId } = await api.createSession(pendingPhone, region, '', true)
      router.push(`/pair/${sessionId}`)
    } catch (err) { setCommunityError(err.message) }
    finally { setLoading(false) }
  }

  return <Layout title="Pair a number">
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="bg-gradient-to-r from-slate-950 to-indigo-900 p-5 sm:p-6 text-white"><p className="text-xs uppercase tracking-[.2em] text-indigo-200">Secure device linking</p><h2 className="mt-1 text-xl font-bold">Connect WhatsApp</h2><p className="mt-1 text-sm text-slate-300">Choose a country, enter the number and request a fresh pairing code.</p></div>
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
        <div><label className="mb-1 block text-sm font-semibold">Find your country</label><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search country or calling code" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-sm" /></div>
        <div><label className="mb-1 block text-sm font-semibold">Country calling code</label><select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-sm">{filtered.map((c,i) => <option key={c.label + i} value={c.code}>{c.flag ? String.fromCodePoint(...c.flag.toUpperCase().split('').map(ch => 127397 + ch.charCodeAt())) + ' ' : ''}{c.label}</option>)}</select><input aria-label="Custom calling code" value={countryCode} onChange={e => setCountryCode(e.target.value.startsWith('+') ? e.target.value.replace(/[^+\d]/g,'') : '+' + e.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2.5 text-sm" placeholder="Custom code, e.g. +358" /></div>
        <div><label className="mb-1 block text-sm font-semibold">WhatsApp phone number</label><input value={number} onChange={e => setNumber(e.target.value)} inputMode="tel" autoComplete="tel-national" placeholder="771 909 006" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-sm" /><p className="mt-1 text-xs text-slate-500">Enter the number without the country calling code.</p></div>
        <div><label className="mb-1 block text-sm font-semibold">Preferred server region</label><select value={region} onChange={e => setRegion(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-3 text-sm">{REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select><p className="mt-1 text-xs text-slate-500">These are routing preferences. Only configured servers can host bot workers.</p></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">Generate pairing code</button>
      </form>
    </div>

  </Layout>
}
