'use client'

import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string
}

/**
 * Generic React Error Boundary.
 * Wrap any component that might crash (PDFs, charts, AI cards) to prevent
 * the error from propagating and taking down the whole page.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Failed to load.</p>}>
 *     <MaybeUnstableComponent />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unknown error' }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught error:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center gap-3 rounded-xl border border-red-900/40 bg-red-950/20 p-4 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Advisor temporarily unavailable. Refresh to retry.</span>
        </div>
      )
    }

    return this.props.children
  }
}
