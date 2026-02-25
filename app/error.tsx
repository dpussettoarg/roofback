'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console for debugging
    console.error('[RoofBack] Client error:', error?.message, error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md w-full rounded-2xl border border-[#2A2D35] p-8 text-center" style={{ backgroundColor: '#1E2228' }}>
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Algo salió mal</h1>
        <p className="text-sm text-[#6B7280] mb-4">
          {error?.message || 'Un error inesperado ocurrió. Probá recargar la página.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={reset}
            variant="outline"
            className="border-[#2A2D35] text-white hover:bg-[#252830]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
          <Link href="/">
            <Button className="btn-lime">Ir al inicio</Button>
          </Link>
        </div>
        <p className="text-xs text-[#4B5563] mt-6">
          Si el problema continúa, verificá la consola del navegador (F12 → Console) y reportá el error.
        </p>
      </div>
    </div>
  )
}
