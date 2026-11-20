import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AccessRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/overview') }, [router])
  return <main className="grid min-h-screen place-items-center bg-[#080b16] text-sm text-slate-400">Opening dashboard…</main>
}
