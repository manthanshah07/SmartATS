import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface MatchScore {
  id: string
  overall_score: number | string
  semantic_score: number | string
  skill_overlap_score: number | string
  matched_skills: string[]
  missing_skills: string[]
  created_at?: string
  updated_at?: string
}

export interface ApplicationJob {
  id: string
  title: string
  company?: {
    id?: string
    name: string
    is_verified?: boolean
  }
  department?: string
  location?: string
  job_type?: string
}

export interface ApplicationResume {
  id: string
  file: string
  original_filename: string
  file_size?: number
  mime_type?: string
}

export type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "OFFERED"
  | "REJECTED"
  | "WITHDRAWN"

export interface Application {
  id: string
  job: ApplicationJob
  candidate_id: string
  candidate_email: string
  resume?: ApplicationResume
  status: ApplicationStatus
  cover_letter?: string
  match_score?: MatchScore | null
  created_at: string
  updated_at: string
}

export interface ApplicationFilters {
  job_id?: string
  status?: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface UpdateStatusParams {
  applicationId: string
  newStatus: ApplicationStatus
  notes?: string
}

export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: ["applications", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.job_id) {
        params.append("job_id", filters.job_id)
      }
      if (filters?.status && filters.status !== "all") {
        params.append("status", filters.status.toUpperCase())
      }

      const queryString = params.toString() ? `?${params.toString()}` : ""
      const response = await api.get<PaginatedResponse<Application> | Application[]>(
        `/applications/${queryString}`
      )

      if (Array.isArray(response.data)) {
        return response.data
      }
      return response.data.results
    },
  })
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ applicationId, newStatus, notes }: UpdateStatusParams) => {
      const response = await api.patch(`/applications/${applicationId}/`, {
        status: newStatus,
        notes: notes || `Moved to ${newStatus}`,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
    },
  })
}
