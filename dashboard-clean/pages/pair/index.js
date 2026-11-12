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
  const [forkOpened, setForkOpened] = useState(false)
  const [starOpened, setStarOpened] = useState(false)
  const [communityConfirmed, setCommunityConfirmed] = useState(false)
  const [communityError, setCommunityError] = useState('')

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
    if (kind === 'fork') {
      const nextFork = true; setForkOpened(nextFork)
      if (nextFork && starOpened) playCongratulations()
    } else {
      const nextStar = true; setStarOpened(nextStar)
      if (forkOpened && nextStar) playCongratulations()
    }
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
    setForkOpened(false); setStarOpened(false); setCommunityConfirmed(false); setCommunityError('')
    setShowCommunityGate(true)
  }

  async function continueToPairing() {
    if (!forkOpened || !starOpened || !communityConfirmed) {
      setCommunityError('Open both GitHub actions and confirm that you have completed the fork and star before continuing.')
      return
    }
    setLoading(true); setCommunityError('')
    try {
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
        <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[.2em] text-indigo-600">A little support keeps us growing</p>
        <h2 id="community-gate-title" className="mt-2 text-center text-2xl font-black">Fork & Star the project</h2>
        <p className="mt-2 text-center text-sm leading-6 text-slate-500 dark:text-slate-400">Before pairing, please fork WANNA-CRY THANXIEE to your GitHub account and star the original repository. It helps others discover the project.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => openCommunityLink('fork')} className={'rounded-2xl border p-4 text-left transition ' + (forkOpened ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 hover:border-indigo-400 dark:border-slate-700')}><span className="flex items-center justify-between"><span className="text-2xl">⑂</span><span className="text-xs font-bold">{forkOpened ? '✓ Opened' : 'Step 1'}</span></span><span className="mt-2 block font-bold">Fork repository</span><span className="mt-1 block text-xs text-slate-500">Opens GitHub's Fork page in a new tab.</span></button>
          <button type="button" onClick={() => openCommunityLink('star')} className={'rounded-2xl border p-4 text-left transition ' + (starOpened ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200 hover:border-indigo-400 dark:border-slate-700')}><span className="flex items-center justify-between"><span className="text-2xl">★</span><span className="text-xs font-bold">{starOpened ? '✓ Opened' : 'Step 2'}</span></span><span className="mt-2 block font-bold">Star repository</span><span className="mt-1 block text-xs text-slate-500">Opens the original repository so you can star it.</span></button>
        </div>
        {forkOpened && starOpened && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">🎉 Congratulations! Thanks for supporting the project.</div>}
        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><input type="checkbox" checked={communityConfirmed} onChange={e => setCommunityConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" /><span>I have completed the fork and starred the original repository.</span></label>
        <p className="mt-2 text-[11px] leading-5 text-slate-500">This simple flow does not use GitHub API access. Opening the links is not proof of a fork or star; pairing continues based on your confirmation.</p>
        {communityError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{communityError}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={() => setShowCommunityGate(false)} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">Not now</button><button type="button" onClick={continueToPairing} disabled={loading || !forkOpened || !starOpened || !communityConfirmed} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Starting pairing…' : 'Continue to pairing'}</button></div>
      </div>
    </div>}
  </Layout>
}
