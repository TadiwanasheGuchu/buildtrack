import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getNotifications, getUnreadCount, markAllRead, markRead } from '@/services/notificationService'
import type { AppNotification, NotificationType } from '@/types/notification'

const TYPE_ICONS: Record<NotificationType, string> = {
  post: 'photo_camera',
  milestone: 'flag',
  punch: 'checklist',
  budget: 'payments',
  team: 'group',
}

function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const refreshCount = useCallback(() => {
    getUnreadCount().then(setUnread).catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 60_000)
    return () => clearInterval(interval)
  }, [refreshCount])

  async function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setLoading(true)
      try {
        setItems(await getNotifications())
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleClick(n: AppNotification) {
    if (!n.read) {
      setItems(prev => prev.map(i => i.id === n.id ? { ...i, read: true } : i))
      setUnread(prev => Math.max(0, prev - 1))
      markRead(n.id).catch(() => {})
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  async function handleMarkAllRead() {
    setItems(prev => prev.map(i => ({ ...i, read: true })))
    setUnread(0)
    markAllRead().catch(() => {})
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high"
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        >
          notifications
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[11px] font-sans font-bold flex items-center justify-center leading-none">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0 max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <h3 className="font-bold text-on-surface text-label-md">Notifications</h3>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-primary text-caption font-bold hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-on-surface-variant text-body-md">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px]">notifications_off</span>
              <p className="text-body-md">You're all caught up</p>
            </div>
          ) : (
            items.map(n => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 flex gap-3 border-b border-outline-variant last:border-b-0 transition-colors hover:bg-surface-container-high ${
                  n.read ? 'bg-transparent' : 'bg-primary-container/20'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center shrink-0 text-primary">
                  <span className="material-symbols-outlined text-[20px]">{TYPE_ICONS[n.type] ?? 'notifications'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-label-md truncate ${n.read ? 'text-on-surface-variant' : 'text-on-surface font-bold'}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  <p className="text-body-md text-on-surface-variant line-clamp-2">{n.message}</p>
                  <p className="text-caption text-on-surface-variant mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
