import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"

export interface JobSkill {
  id: string
  skill_name: string
  is_required: boolean
}

export interface Company {
  id: string
  name: string
  slug?: string
  logo_url?: string | null
  industry?: string | null
  is_verified: boolean
}

export interface Job {
  id: string
  title: string
  slug: string
  company: Company
  department?: string
  location?: string
  job_type: string
  salary_min?: string | number | null
  salary_max?: string | number | null
  description?: string
  skills?: JobSkill[]
  is_active: boolean
  created_at: string
}

export interface JobFilters {
  search?: string
  location?: string
  job_type?: string
  salary_min?: number | string
  salary_max?: number | string
  is_active?: boolean
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApplyParams {
  jobId: string
  file: File
  coverLetter?: string
}

function normalizeJobType(val?: string): string | undefined {
  if (!val || val.toLowerCase() === "all") return undefined
  const cleaned = val.replace(/[- ]/g, "_").toUpperCase()
  return cleaned
}

export function formatSalary(
  min?: string | number | null,
  max?: string | number | null
): string {
  const numMin = min ? Number(min) : null
  const numMax = max ? Number(max) : null

  if (numMin && numMax) {
    const kMin = Math.round(numMin / 1000)
    const kMax = Math.round(numMax / 1000)
    return `$${kMin}k – $${kMax}k`
  }
  if (numMin) {
    return `From $${Math.round(numMin / 1000)}k`
  }
  if (numMax) {
    return `Up to $${Math.round(numMax / 1000)}k`
  }
  return "Competitive salary"
}

export function formatJobType(type?: string): string {
  if (!type) return "Full-time"
  switch (type.toUpperCase()) {
    case "FULL_TIME":
      return "Full-time"
    case "PART_TIME":
      return "Part-time"
    case "CONTRACT":
      return "Contract"
    case "INTERNSHIP":
      return "Internship"
    case "REMOTE":
      return "Remote"
    default:
      return type
  }
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.search?.trim()) {
        params.append("search", filters.search.trim())
      }
      if (filters?.location?.trim()) {
        params.append("location", filters.location.trim())
      }

      const normalizedType = normalizeJobType(filters?.job_type)
      if (normalizedType) {
        params.append("job_type", normalizedType)
      }

      if (filters?.salary_min) {
        params.append("salary_min", String(filters.salary_min))
      }
      if (filters?.salary_max) {
        params.append("salary_max", String(filters.salary_max))
      }
      if (filters?.is_active !== undefined) {
        params.append("is_active", String(filters.is_active))
      } else {
        params.append("is_active", "true")
      }

      const queryString = params.toString() ? `?${params.toString()}` : ""
      const response = await api.get<PaginatedResponse<Job> | Job[]>(
        `/jobs/${queryString}`
      )

      if (Array.isArray(response.data)) {
        return response.data
      }
      return response.data.results
    },
  })
}

export function useApplyToJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ jobId, file, coverLetter }: ApplyParams) => {
      // Step A: Upload Resume
      const formData = new FormData()
      formData.append("file", file)

      const resumeResponse = await api.post("/resumes/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      const resumeId = resumeResponse.data.id

      // Step B: Submit Application with resume_id and job_id
      const applicationResponse = await api.post("/applications/", {
        job_id: jobId,
        resume_id: resumeId,
        cover_letter: coverLetter || "",
      })

      return applicationResponse.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] })
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
    },
  })
}

export interface CreateJobSkillParam {
  skill_name: string
  is_required?: boolean
}

export interface CreateJobParams {
  title: string
  company_id: string
  department?: string
  location?: string
  job_type: string
  salary_min?: number | string
  salary_max?: number | string
  description: string
  skills?: CreateJobSkillParam[]
  is_active?: boolean
}

export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobData: CreateJobParams) => {
      const response = await api.post<Job>("/jobs/", jobData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] })
      queryClient.invalidateQueries({ queryKey: ["recruiter-analytics"] })
      queryClient.invalidateQueries({ queryKey: ["analytics"] })
    },
  })
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Company> | Company[]>(
        "/companies/"
      )
      if (Array.isArray(response.data)) {
        return response.data
      }
      return response.data.results
    },
  })
}

