'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

let cachedProfile: Profile | null = null
let cacheUserId: string | null = null

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile)
  const [loading, setLoading] = useState(!cachedProfile)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Serve from cache if same user
      if (cacheUserId === user.id && cachedProfile) {
        setProfile(cachedProfile)
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        cachedProfile = data as Profile
        cacheUserId = user.id
        setProfile(cachedProfile)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isOwner = profile?.role === 'owner'
  const canSeeFinancials = isOwner  // ops and cs cannot see profit / billing

  return { profile, loading, isOwner, canSeeFinancials }
}
