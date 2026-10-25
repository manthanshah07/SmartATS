import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface ScheduleInterviewParams {
  application_id: string
  round_name: string
  scheduled_start: string
  scheduled_end: string
  meeting_url?: string
}

export function useScheduleInterview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: ScheduleInterviewParams) => {
      const response = await api.post("/interviews/", payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
    },
  })
}
