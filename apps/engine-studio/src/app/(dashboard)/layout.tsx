"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Toaster } from "@/components/layout/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </div>
  )
}
