'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  job_id: string | null
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const supabase = createClient()
  const { lang } = useI18n()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await fetchNotifications(user.id)

      // Subscribe to realtime
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
          (payload: { new: Notification }) => {
            setNotifications((prev) => [payload.new, ...prev].slice(0, 50))
          }
        )
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function fetchNotifications(uid: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications((data as Notification[]) || [])
  }

  async function markAllRead() {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return lang === 'es' ? 'ahora' : 'just now'
    if (m < 60) return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  const typeIcon: Record<string, string> = {
    status_change: '📋',
    new_note: '💬',
    milestone: '📍',
    info: 'ℹ️',
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#1E2228] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-[#9CA3AF]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-[#1E2228] border border-[#2A2D35] rounded-2xl shadow-2xl z-[100] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2D35]">
            <h3 className="text-sm font-bold text-white">
              {lang === 'es' ? 'Notificaciones' : 'Notifications'}
              {unread > 0 && (
                <span className="ml-2 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unread}</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-[#A8FF3E] hover:underline flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" />
                  {lang === 'es' ? 'Leer todas' : 'Mark all read'}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#4B5563] hover:text-white p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#2A2D35]">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B7280]">
                {lang === 'es' ? 'No hay notificaciones' : 'No notifications yet'}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-[#252830] transition-colors cursor-pointer ${
                    !n.read ? 'bg-[#A8FF3E]/3' : ''
                  }`}
                  onClick={() => markRead(n.id)}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] || 'ℹ️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.read ? 'text-white font-semibold' : 'text-[#9CA3AF]'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-[#4B5563] flex-shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && (
                      <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    {n.job_id && (
                      <Link
                        href={`/jobs/${n.job_id}`}
                        onClick={() => setOpen(false)}
                        className="text-[11px] text-[#A8FF3E] hover:underline mt-1 block"
                      >
                        {lang === 'es' ? 'Ver trabajo →' : 'View job →'}
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-[#A8FF3E] flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
