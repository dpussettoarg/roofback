'use client'

import { useOrganization } from './useOrganization'
import type { UserRole } from '@/lib/types'

/**
 * Fine-grained permission flags derived from the user's role.
 *
 * Role matrix:
 *  owner  — sees everything including profit, billing, team management
 *  ops    — sees job details, total contract, materials, costs
 *           CANNOT see profit metrics, billing section
 */
export function usePermissions() {
  const { profile, isOwner, loading } = useOrganization()
  const role: UserRole = (profile?.role as UserRole) ?? 'ops'

  return {
    loading,
    role,
    isOwner,
    // Financial visibility
    canSeeProfit:      isOwner,   // profit card, margin %, profit chart
    canSeeContractTotal: true,    // both roles see the job's $ total
    canSeeCostBreakdown: true,    // materials, labor, other costs
    // Settings sections
    canManageBilling:  isOwner,
    canManageTeam:     isOwner,
    // Invitation management
    canInviteMembers:  isOwner,
    canRemoveMembers:  isOwner,
  }
}
