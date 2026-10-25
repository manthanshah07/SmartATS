import React from "react"
import "@testing-library/jest-dom/vitest"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import AuthGuard from "../AuthGuard"
import * as auth from "../../lib/auth"

describe("AuthGuard Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("redirects unauthenticated users to /login", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(false)
    vi.spyOn(auth, "getCurrentUser").mockReturnValue(null)

    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <AuthGuard allowedRoles={["RECRUITER"]}>
                <div>Protected Content</div>
              </AuthGuard>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Login Page")).toBeInTheDocument()
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument()
  })

  it("redirects candidate attempting to access recruiter route to /candidate/jobs", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(true)
    vi.spyOn(auth, "getCurrentUser").mockReturnValue({
      id: "u-1",
      email: "candidate@test.com",
      role: "CANDIDATE",
    })

    render(
      <MemoryRouter initialEntries={["/recruiter/pipeline"]}>
        <Routes>
          <Route
            path="/recruiter/pipeline"
            element={
              <AuthGuard allowedRoles={["RECRUITER"]}>
                <div>Recruiter Pipeline</div>
              </AuthGuard>
            }
          />
          <Route path="/candidate/jobs" element={<div>Candidate Jobs Portal</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Candidate Jobs Portal")).toBeInTheDocument()
    expect(screen.queryByText("Recruiter Pipeline")).not.toBeInTheDocument()
  })

  it("renders protected content when user has the allowed role", () => {
    vi.spyOn(auth, "isAuthenticated").mockReturnValue(true)
    vi.spyOn(auth, "getCurrentUser").mockReturnValue({
      id: "u-2",
      email: "recruiter@test.com",
      role: "RECRUITER",
    })

    render(
      <MemoryRouter initialEntries={["/recruiter/pipeline"]}>
        <Routes>
          <Route
            path="/recruiter/pipeline"
            element={
              <AuthGuard allowedRoles={["RECRUITER"]}>
                <div>Recruiter Pipeline Active</div>
              </AuthGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText("Recruiter Pipeline Active")).toBeInTheDocument()
  })
})
