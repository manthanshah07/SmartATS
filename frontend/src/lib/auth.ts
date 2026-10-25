import api from "./api"

export interface AuthUser {
  id?: string
  email?: string
  role?: "CANDIDATE" | "RECRUITER" | "ADMIN" | string
  first_name?: string
  last_name?: string
  [key: string]: any
}

export function decodeJwt(token: string | null): Record<string, any> | null {
  if (!token) return null
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch (err) {
    return null
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token") || localStorage.getItem("access")
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token") || localStorage.getItem("refresh")
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  const payload = decodeJwt(token)
  if (!payload || !payload.exp) return true
  // Check against current time (giving 10 second clock skew buffer)
  return payload.exp * 1000 <= Date.now() + 10000
}

export function getCurrentUser(): AuthUser | null {
  const token = getAccessToken()
  const refreshToken = getRefreshToken()

  if (!token && !refreshToken) {
    return null
  }

  // First try to parse stored user profile object
  const storedUserStr = localStorage.getItem("user")
  if (storedUserStr) {
    try {
      const parsed = JSON.parse(storedUserStr)
      if (parsed && typeof parsed === "object") {
        return parsed
      }
    } catch {
      // Fallback to token payload
    }
  }

  // Fallback to JWT payload
  if (token) {
    const payload = decodeJwt(token)
    if (payload) {
      return {
        id: payload.user_id || payload.sub,
        email: payload.email,
        role: payload.role,
      }
    }
  }

  return null
}

export function isAuthenticated(): boolean {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()

  if (!accessToken && !refreshToken) {
    return false
  }

  if (accessToken && !isTokenExpired(accessToken)) {
    return true
  }

  // If access token is expired but refresh token exists, session can still be refreshed
  if (refreshToken && !isTokenExpired(refreshToken)) {
    return true
  }

  return false
}

export function setAuthSession(data: {
  access: string
  refresh?: string
  user?: AuthUser
}): void {
  if (data.access) {
    localStorage.setItem("access_token", data.access)
    localStorage.setItem("access", data.access)
  }
  if (data.refresh) {
    localStorage.setItem("refresh_token", data.refresh)
    localStorage.setItem("refresh", data.refresh)
  }
  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user))
  } else if (data.access) {
    const payload = decodeJwt(data.access)
    if (payload) {
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: payload.user_id || payload.sub,
          email: payload.email,
          role: payload.role,
        })
      )
    }
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem("access_token")
  localStorage.removeItem("access")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("refresh")
  localStorage.removeItem("user")
}

export async function logoutUser(navigate?: (path: string) => void): Promise<void> {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    try {
      await api.post("/auth/logout/", { refresh: refreshToken })
    } catch {
      // Ignore API logout errors to guarantee client cleanup
    }
  }
  clearAuthSession()
  if (navigate) {
    navigate("/login")
  } else {
    window.location.href = "/login"
  }
}
