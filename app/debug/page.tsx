import { redirect } from 'next/navigation'

/**
 * Página temporal de diagnóstico para verificar variables de entorno.
 * Acceso: /debug?secret=roofback-debug
 *
 * IMPORTANTE: Eliminar o deshabilitar en producción.
 */
export default async function DebugPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>
}) {
  const params = await searchParams
  const SECRET = process.env.DEBUG_PAGE_SECRET || 'roofback-debug'

  if (params.secret !== SECRET) {
    redirect('/login')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

  const mask = (val: string | undefined) =>
    val && val.length >= 5 ? `${val.slice(0, 5)}...` : val ? `${val.slice(0, val.length)}...` : 'MISSING'

  // Log en consola del servidor (visible en Netlify Function logs)
  console.log('[RoofBack Debug]', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SITE_URL: siteUrl || 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  })

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-mono text-sm">
      <h1 className="text-xl font-bold text-slate-900 mb-4">RoofBack — Diagnóstico de Env</h1>
      <p className="text-slate-500 mb-6 text-xs">
        Solo para diagnóstico. Eliminar en producción.
      </p>

      <div className="space-y-2 max-w-lg">
        <div className="flex justify-between gap-4 p-3 bg-white rounded-lg border border-slate-200">
          <span className="text-slate-500">NEXT_PUBLIC_SUPABASE_URL</span>
          <span className={supabaseUrl ? 'text-green-600' : 'text-red-600'}>
            {supabaseUrl ? mask(supabaseUrl) : 'MISSING'}
          </span>
        </div>
        <div className="flex justify-between gap-4 p-3 bg-white rounded-lg border border-slate-200">
          <span className="text-slate-500">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
          <span className={anonKey ? 'text-green-600' : 'text-red-600'}>
            {anonKey ? mask(anonKey) : 'MISSING'}
          </span>
        </div>
        <div className="flex justify-between gap-4 p-3 bg-white rounded-lg border border-slate-200">
          <span className="text-slate-500">NEXT_PUBLIC_SITE_URL</span>
          <span className={siteUrl ? 'text-green-600' : 'text-amber-600'}>
            {siteUrl || 'MISSING (fallback: VERCEL_URL / URL / localhost)'}
          </span>
        </div>
        <div className="flex justify-between gap-4 p-3 bg-white rounded-lg border border-slate-200">
          <span className="text-slate-500">NODE_ENV</span>
          <span>{process.env.NODE_ENV || 'undefined'}</span>
        </div>
      </div>

      {(!supabaseUrl || !anonKey) && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-semibold">Acción requerida en Netlify:</p>
          <p className="mt-1 text-xs">
            Site settings → Environment variables → Agregar NEXT_PUBLIC_SUPABASE_URL y
            NEXT_PUBLIC_SUPABASE_ANON_KEY. Redeploy después de cambiar.
          </p>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Revisá también: Supabase → Auth → URL Configuration → Redirect URLs debe incluir
        https://roofback.app/auth/callback
      </p>
    </div>
  )
}
