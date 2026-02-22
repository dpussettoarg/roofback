'use client'

/**
 * Thin compatibility wrapper — delegates to useOrganization.
 * Existing components that import useProfile continue to work unchanged.
 */
import { useOrganization } from './useOrganization'

export function useProfile() {
  const { profile, loading, isOwner } = useOrganization()

  return {
    profile,
    loading,
    isOwner,
    // Legacy flag: ops CAN see costs but not profit
    canSeeFinancials: isOwner,
  }
}
