import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor: attach access token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem("access_token") || localStorage.getItem("access")
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

interface QueuedPromise {
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}

let isRefreshing = false
let failedQueue: QueuedPromise[] = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor: automatically refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (!originalRequest) {
      return Promise.reject(error)
    }

    // Skip refresh logic for authentication endpoints or if already retried
    const isAuthEndpoint =
      originalRequest.url?.includes("/auth/token/") ||
      originalRequest.url?.includes("/auth/login/") ||
      originalRequest.url?.includes("/auth/refresh/")

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      const refreshToken =
        localStorage.getItem("refresh_token") || localStorage.getItem("refresh")

      if (!refreshToken) {
        localStorage.removeItem("access_token")
        localStorage.removeItem("access")
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const response = await axios.post(`${baseURL}/auth/refresh/`, {
          refresh: refreshToken,
        })

        const newAccess = response.data.access
        const newRefresh = response.data.refresh || refreshToken

        localStorage.setItem("access_token", newAccess)
        localStorage.setItem("access", newAccess)
        if (newRefresh) {
          localStorage.setItem("refresh_token", newRefresh)
          localStorage.setItem("refresh", newRefresh)
        }

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`
        }

        processQueue(null, newAccess)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem("access_token")
        localStorage.removeItem("access")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("refresh")
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
