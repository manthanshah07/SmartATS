import React from "react"
import { useNavigate } from "react-router-dom"
import { Bell, Check, CheckCheck, Clock, ExternalLink, Inbox, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/primitives"
import {
  NotificationItem,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useNotifications"

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Recently"
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  const diffInWeeks = Math.floor(diffInDays / 7)
  return `${diffInWeeks}w ago`
}

export default function NotificationBell(): React.ReactElement {
  const navigate = useNavigate()
  const { data: notifications = [], isLoading } = useNotifications()
  const markAllReadMutation = useMarkAllNotificationsRead()
  const markSingleReadMutation = useMarkNotificationRead()

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markSingleReadMutation.mutateAsync(notif.id)
      } catch {
        // silent fail
      }
    }
    if (notif.link) {
      navigate(notif.link)
    }
  }

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await markAllReadMutation.mutateAsync()
    } catch {
      // silent fail
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications (${unreadCount} unread)`}
          className="relative inline-flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600/30"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-xs ring-2 ring-white animate-in zoom-in-75">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900">Notifications</h3>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                {unreadCount} unread
              </span>
            ) : (
              <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                All caught up
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              disabled={markAllReadMutation.isPending}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
            >
              {markAllReadMutation.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCheck className="size-3" />
              )}
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="size-5 animate-spin text-indigo-600" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-400 mb-2">
                <Inbox className="size-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                No notifications yet
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400 max-w-xs">
                When recruiters advance your stage or schedule interviews, alerts will appear here.
              </p>
            </div>
          ) : (
            notifications.slice(0, 15).map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-3 p-3.5 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                  !notif.is_read ? "bg-indigo-50/40" : ""
                }`}
              >
                {/* Status Dot */}
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${
                    !notif.is_read ? "bg-indigo-600 ring-2 ring-indigo-200" : "bg-transparent"
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        !notif.is_read
                          ? "font-bold text-slate-900"
                          : "font-semibold text-slate-700"
                      }`}
                    >
                      {notif.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="size-2.5" />
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 line-clamp-2">
                    {notif.message}
                  </p>

                  {notif.link && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                      View details <ExternalLink className="size-2.5" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
