import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { signOut as authSignOut, getProfile } from '../lib/auth'

export interface Profile {
  id: string
  nickname: string
  email: string | null
  subscription_type: string
  default_paper: string | null
  default_stamp: string | null
  theme: string | null
  created_at: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Resolve existing session on mount.
    //    setLoading(false) MUST be called unconditionally — both on success
    //    and on error (e.g. expired/unrefreshable token). Without the .catch(),
    //    a rejected getSession() would leave loading=true forever.
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          getProfile(session.user.id).then(setProfile).catch(() => setProfile(null))
        }
        console.log('[auth] authLoading set to false')
        setLoading(false)
      })
      .catch(() => {
        // getSession() rejected (network error, bad refresh token, etc.)
        // Clear state and always unblock the UI.
        console.log('[auth] authLoading set to false (getSession error)')
        setUser(null)
        setProfile(null)
        setLoading(false)
      })

    // 2. Stay in sync with sign-in / sign-out / token refresh events.
    //    IMPORTANT: must NOT be async — Supabase does not await async
    //    onAuthStateChange callbacks, which stalls signInWithPassword.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          getProfile(session.user.id).then(setProfile).catch(() => setProfile(null))
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => authSignOut()

  return { user, profile, loading, signOut }
}
