'use client'

import { NotificationBell } from './notification-bell'

/**
 * Persistent top-right actions bar (notification bell).
 * Rendered inside each protected page header via fixed positioning.
 */
export function AppHeader() {
  return (
    <div className="fixed top-0 right-0 z-40 flex items-center gap-2 px-4 py-3">
      <NotificationBell />
    </div>
  )
}
