import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { api, getUser, setToken, setUser } from './api'

// Automatically issue a guest session so the dashboard opens without signup.
export function useAuthGuard() {
  const router = useRouter()
  const [user, setUserState] = useState(undefined)

  useEffect(() => {
    let active = true
    async function openWorkspace() {
      const existing = getUser()
      if (existing) { if (active) setUserState(existing); return }
      try {
        const result = await api.guest()
        if (!active) return
        setToken(result.token, true)
        setUser(result.user)
        setUserState(result.user)
      } catch (_) {
        if (active) setUserState(null)
      }
    }
    openWorkspace()
    return () => { active = false }
  }, [router])

  return user
}
