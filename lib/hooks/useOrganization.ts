'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Organization, Customer } from '@/lib/types'

// Module-level cache — avoids N+1 fetches when multiple components mount
let _profile: Profile | null = null
let _org: Organization | null = null
let _userId: string | null = null
let _loadPromise: Promise<void> | null = null

export interface OrgMember {
  id: string
  full_name: string
  email: string
  role: 'owner' | 'ops'
  avatar_url?: string
}

export function useOrganization() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(_profile)
  const [org, setOrg] = useState<Organization | null>(_org)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [loading, setLoading] = useState(!_profile)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Use cached data if same session
    if (_userId === user.id && _profile) {
      setProfile(_profile)
      setOrg(_org)
      setLoading(false)
      return
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!prof) { setLoading(false); return }

    _profile = prof as Profile
    _userId = user.id
    setProfile(_profile)

    if (prof.organization_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', prof.organization_id)
        .single()
      _org = orgData as Organization
      setOrg(_org)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!_loadPromise) {
      _loadPromise = load().finally(() => { _loadPromise = null })
    } else {
      _loadPromise.then(() => {
        setProfile(_profile)
        setOrg(_org)
        setLoading(false)
      })
    }
  }, [load])

  const loadMembers = useCallback(async () => {
    if (!_profile?.organization_id) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('organization_id', _profile.organization_id)
      .order('role')
    setMembers((data as OrgMember[]) || [])
  }, [supabase])

  /** Invalidate cache — call after mutation */
  const invalidate = useCallback(() => {
    _profile = null
    _org = null
    _userId = null
    _loadPromise = null
  }, [])

  return {
    profile,
    org,
    members,
    loading,
    orgId: profile?.organization_id ?? null,
    isOwner: profile?.role === 'owner',
    loadMembers,
    invalidate,
  }
}
