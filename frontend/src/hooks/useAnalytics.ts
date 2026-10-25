import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"

export interface ApplicantJobMetric {
  job_id: string
  job_title: string
  company_name: string | null
  total_applicants: number
}

export interface FunnelBreakdownItem {
  status: string
  count: number
}

export interface RecruiterAnalyticsData {
  total_active_jobs: number
  total_applications: number
  applicants_per_job: ApplicantJobMetric[]
  status_funnel: Record<string, number>
  funnel_breakdown: FunnelBreakdownItem[]
  average_time_to_hire_days: number
  average_time_in_stage_days: Record<string, number>
}

export function useAnalytics() {
  return useQuery<RecruiterAnalyticsData>({
    queryKey: ["recruiter-analytics"],
    queryFn: async () => {
      const response = await api.get<RecruiterAnalyticsData>(
        "/analytics/recruiter/"
      )
      return response.data
    },
  })
}
