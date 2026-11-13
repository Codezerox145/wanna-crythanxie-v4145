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
const GITHUB_REPO = (process.env.NEXT_PUBLIC_GITHUB_REPO || 'https://github.com/Codezerox145/wanna-crythanxie-v4145').replace(/\/$/, '')

function playCongratulations() {
  if (typeof window === 'undefined') return
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const context = new AudioContext()
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.13)
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + index * 0.13 + 0.025)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.13 + 0.22)
      oscillator.connect(gain); gain.connect(context.destination)
      oscillator.start(context.currentTime + index * 0.13)
      oscillator.stop(context.currentTime + index * 0.13 + 0.24)
    })
    setTimeout(() => context.close().catch(() => {}), 1100)
  } catch (_) { /* Sound is an enhancement; pairing remains available. */ }
}

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
  const [showCommunityGate, setShowCommunityGate] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [communityConfirmed, setCommunityConfirmed] = useState(false)
  const [communityError, setCommunityError] = useState('')
  const [githubUsername, setGithubUsername] = useState('')

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

  function openCommunityLink(kind) {
    const target = kind === 'fork' ? `${GITHUB_REPO}/fork` : GITHUB_REPO
    window.open(target, '_blank', 'noopener,noreferrer')
    setCommunityError('')
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const digits = number.replace(/\D/g, '')
    const dial = countryCode.replace(/\D/g, '')
    if (!digits || !/^\d{1,4}$/.test(dial) || (dial + digits).length < 8 || (dial + digits).length > 15) {
      setError('Enter a valid international WhatsApp number (8–15 digits including country code).')
      return
    }
    setPendingPhone(dial + digits)
    setCommunityConfirmed(false); setCommunityError('')
    setShowCommunityGate(true)
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
        <button type="submit" disabled={loading} className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">Continue to community support</button>
      </form>
    </div>

    {showCommunityGate && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="community-gate-title">
      <div className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-7">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-3xl dark:bg-indigo-900/40">⭐</div>
        <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[.2em] text-indigo-600">PROJECT SUPPORT</p>
        <h2 id="community-gate-title" className="mt-2 text-center text-2xl font-black">GitHub support</h2>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500 dark:text-slate-400">Complete both GitHub actions to continue.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => openCommunityLink('fork')} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-indigo-400 dark:border-slate-700"><span className="flex items-center justify-between"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M7 3h3v7.2l7.1-4.1 1.5 2.6-7.1 4.1 7.1 4.1-1.5 2.6L10 15.4V22H7V3Z"/></svg><span className="text-xs font-bold">Step 1</span></span><span className="mt-2 block font-bold">Fork repository</span><span className="mt-1 block text-xs text-slate-500">Opens GitHub's Fork page in a new tab.</span></button>
          <button type="button" onClick={() => openCommunityLink('star')} className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-indigo-400 dark:border-slate-700"><span className="flex items-center justify-between"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="m12 2 3.1 6.3 7 1-5.1 4.9 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-4.9 7-1L12 2Z"/></svg><span className="text-xs font-bold">Step 2</span></span><span className="mt-2 block font-bold">Star repository</span><span className="mt-1 block text-xs text-slate-500">Opens the original repository so you can star it.</span></button>
        </div>
        <div className="mt-4"><label className="mb-1 block text-xs font-semibold">GitHub username</label><input value={githubUsername} onChange={e => setGithubUsername(e.target.value)} autoComplete="username" placeholder="your-github-username" className="w-full rounded-xl border border-slate-200 bg-transparent px-3 py-3 text-sm dark:border-slate-700" /></div>
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><input type="checkbox" checked={communityConfirmed} onChange={e => setCommunityConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" /><span>I have starred and forked the repository.</span></label>
        
        {communityError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{communityError}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setShowCommunityGate(false)} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">Not now</button><button type="button" onClick={continueToPairing} disabled={loading || !githubUsername.trim() || !communityConfirmed} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Starting pairing…' : 'Continue to pairing'}</button></div>
      </div>
    </div>}
  </Layout>
}
