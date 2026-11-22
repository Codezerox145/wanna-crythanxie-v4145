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
      } catch (error) {
        // Keep the interface visible when the API is temporarily unavailable.
        // Data actions will show the API error instead of rendering a blank page.
        if (active) setUserState({ id: null, email: 'Guest workspace', is_guest: true, offline: true, connection_error: error?.message || 'API unavailable' })
      }
    }
    openWorkspace()
    return () => { active = false }
  }, [router])

  return user
}
