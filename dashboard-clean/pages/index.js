import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace('/overview') }, [router])
  return <main className="min-h-screen bg-[#070b18] text-white grid place-items-center"><p className="text-sm text-slate-400">Opening WANNA-CRY THANXIEE dashboard…</p></main>
}
