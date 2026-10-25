import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface NotificationItem {
  id: string
  title: string
  message: string
  link?: string | null
  is_read: boolean
  created_at: string
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<NotificationItem[]> => {
      const response = await api.get<
        PaginatedResponse<NotificationItem> | NotificationItem[]
      >("/notifications/")
      if (Array.isArray(response.data)) {
        return response.data
      }
      return response.data.results || []
    },
    refetchInterval: 30000, // Poll every 30 seconds for live updates
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await api.post("/notifications/mark-read/")
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post(`/notifications/${id}/mark-as-read/`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
