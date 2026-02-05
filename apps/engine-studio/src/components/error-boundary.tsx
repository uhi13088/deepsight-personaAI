"use client"

import React from "react"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <AlertCircle className="text-destructive mx-auto mb-4 h-8 w-8" />
            <p className="text-destructive mb-2">렌더링 중 오류가 발생했습니다</p>
            <p className="text-muted-foreground mb-4 text-sm">
              {this.state.error?.message || "알 수 없는 오류"}
            </p>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              다시 시도
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
