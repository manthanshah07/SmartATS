import React from "react"
import "@testing-library/jest-dom/vitest"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import NotificationBell from "../NotificationBell"
import * as notifHook from "../../hooks/useNotifications"

describe("NotificationBell Component", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders bell without unread badge when there are no unread notifications", () => {
    vi.spyOn(notifHook, "useNotifications").mockReturnValue({
      data: [
        {
          id: "1",
          title: "Application Screened",
          message: "Your application passed initial screening.",
          link: "/candidate/applications",
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as any)

    vi.spyOn(notifHook, "useMarkAllNotificationsRead").mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    vi.spyOn(notifHook, "useMarkNotificationRead").mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    )

    const button = screen.getByRole("button", { name: /notifications/i })
    expect(button).toBeInTheDocument()
    expect(screen.queryByText("1")).not.toBeInTheDocument()
  })

  it("renders unread badge when unread notifications exist", () => {
    vi.spyOn(notifHook, "useNotifications").mockReturnValue({
      data: [
        {
          id: "1",
          title: "Interview Scheduled",
          message: "Technical round scheduled for Monday.",
          link: null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          title: "Offer Extended",
          message: "Congratulations on the offer!",
          link: null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as any)

    vi.spyOn(notifHook, "useMarkAllNotificationsRead").mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    vi.spyOn(notifHook, "useMarkNotificationRead").mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    )

    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("opens dropdown and shows notifications on click", async () => {
    vi.spyOn(notifHook, "useNotifications").mockReturnValue({
      data: [
        {
          id: "1",
          title: "Interview Scheduled",
          message: "Technical round scheduled for Monday.",
          link: null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    } as any)

    vi.spyOn(notifHook, "useMarkAllNotificationsRead").mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    vi.spyOn(notifHook, "useMarkNotificationRead").mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    )

    const button = screen.getByRole("button", { name: /notifications/i })
    fireEvent.pointerDown(button, { button: 0 })
    fireEvent.click(button)

    expect(await screen.findByText("Interview Scheduled")).toBeInTheDocument()
    expect(screen.getByText("Mark all as read")).toBeInTheDocument()
  })
})
