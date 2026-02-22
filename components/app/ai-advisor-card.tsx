'use client'

/**
 * AiAdvisorCard — fully isolated, client-only component.
 *
 * Loaded exclusively via:
 *   const AiAdvisorCard = dynamic(
 *     () => import('@/components/app/ai-advisor-card'),
 *     { ssr: false }
 *   )
 *
 * Why isolated?
 *   @react-pdf/renderer and recharts both access browser-only geometry APIs.
 *   When they share a render cycle with the parent dashboard they trigger the
 *   "ie is not a function" crash. Moving them into a separately chunked,
 *   client-only dynamic import gives each their own isolated module scope.
 *
 * All PDF rendering lives here so it never lands in the SSR bundle.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  BrainCircuit,
  RotateCcw,
  FileDown,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import type { BusinessInsightsResponse, BusinessInsight } from '@/app/api/ai/business-insights/route'

// PDF libs — client-only, loaded lazily after mount
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => null }
)
const DailyReportPDF = dynamic(
  () => import('@/components/pdf/daily-report-pdf').then((m) => m.DailyReportPDF),
  { ssr: false, loading: () => null }
)

// ── Types ─────────────────────────────────────────────────────────────────────

interface JobRowData {
  client_name: string
  workflow_stage: string
  estimated_total: number
  actualCost: number
  burnPct: number
  isOverBudget: boolean
}

export interface AiAdvisorCardProps {
  lang: string
  orgId: string | null
  companyName: string
  profileName: string
  activeJobsForPdf: JobRowData[]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: BusinessInsight }) {
  const borderColor =
    insight.type === 'risk'        ? 'border-l-red-400'  :
    insight.type === 'opportunity' ? 'border-l-blue-400' :
    'border-l-[#A8FF3E]'

  const Icon =
    insight.type === 'risk'        ? AlertTriangle :
    insight.type === 'opportunity' ? Lightbulb     :
    CheckCircle2

  const iconColor =
    insight.type === 'risk'        ? 'text-red-400'  :
    insight.type === 'opportunity' ? 'text-blue-400' :
    'text-[#A8FF3E]'

  return (
    <div className={`bg-[#16191F] border border-[#2A2D35] border-l-4 ${borderColor} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white mb-1">{insight.title}</p>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">{insight.body}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AiAdvisorCard({
  lang,
  orgId,
  companyName,
  profileName,
  activeJobsForPdf,
}: AiAdvisorCardProps) {
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiData,    setAiData]      = useState<BusinessInsightsResponse | null>(null)
  const [aiError,   setAiError]     = useState('')
  // Guard: don't try to render PDF components until we're fully in the browser
  const [pdfReady,  setPdfReady]    = useState(false)
  const hasFetched = useRef(false)

  // Signal that we're fully mounted in the browser (past hydration + one RAF)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPdfReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const fetchInsights = useCallback(async () => {
    setAiLoading(true)
    setAiError('')
    try {
      const res = await fetch('/api/ai/business-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, orgId }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Failed')
      }
      const data = (await res.json()) as BusinessInsightsResponse
      setAiData(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setAiError(
        msg === 'Too many requests. Please wait a minute and try again.'
          ? (lang === 'es' ? 'Demasiadas solicitudes. Esperá un minuto.' : msg)
          : (lang === 'es' ? 'Error al obtener consejos. Intentá de nuevo.' : 'Failed to get insights. Please try again.')
      )
    } finally {
      setAiLoading(false)
    }
  }, [lang, orgId])

  // Auto-fetch once on mount
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchInsights()
  }, [fetchInsights])

  const now = new Date()
  const displayName = companyName || profileName

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[#2A2D35]"
      style={{ background: 'linear-gradient(135deg, #0d1f0a 0%, #111827 40%, #0F1117 100%)' }}
    >
      {/* Glow */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #A8FF3E 0%, transparent 70%)' }}
      />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#A8FF3E]/10 border border-[#A8FF3E]/20 flex items-center justify-center flex-shrink-0">
              <BrainCircuit className="h-4 w-4 text-[#A8FF3E]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {lang === 'es' ? 'Asesor de Negocio IA' : 'AI Business Advisor'}
              </h2>
              {aiData && (
                <p className="text-[10px] text-[#6B7280]">
                  {lang === 'es' ? 'Actualizado' : 'Updated'}{' '}
                  {format(new Date(aiData.generatedAt), 'h:mm a')}
                  {aiData.source === 'ai' ? ' · Claude' : ' · Smart Rules'}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={fetchInsights}
            disabled={aiLoading}
            className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5 disabled:opacity-40"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            {lang === 'es' ? 'Actualizar' : 'Refresh'}
          </button>
        </div>

        {/* Summary */}
        {aiData?.summary && !aiLoading && (
          <p className="text-xs text-[#9CA3AF] mb-4 leading-relaxed border-l-2 border-[#A8FF3E]/40 pl-3">
            {aiData.summary}
          </p>
        )}

        {/* Loading skeleton */}
        {aiLoading && (
          <div className="space-y-3 mb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#16191F] rounded-lg p-4 animate-pulse">
                <div className="h-3 bg-[#2A2D35] rounded w-1/3 mb-2" />
                <div className="h-2 bg-[#2A2D35] rounded w-full mb-1" />
                <div className="h-2 bg-[#2A2D35] rounded w-4/5" />
              </div>
            ))}
            <p className="text-center text-xs text-[#6B7280] py-1">
              {lang === 'es' ? 'Analizando tu negocio…' : 'Analyzing your business…'}
            </p>
          </div>
        )}

        {/* Error */}
        {aiError && !aiLoading && (
          <p className="text-xs text-red-400 text-center py-4">{aiError}</p>
        )}

        {/* Insights */}
        {!aiLoading && aiData && (
          <div className="space-y-3">
            {(aiData.insights ?? []).map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </div>
        )}

        {/* PDF download — only render after browser paint (pdfReady gate) */}
        {pdfReady && !aiLoading && aiData && (
          <div className="mt-4 pt-4 border-t border-[#2A2D35]">
            <PDFDownloadLink
              document={
                <DailyReportPDF
                  companyName={displayName}
                  generatedAt={aiData.generatedAt}
                  lang={lang as 'es' | 'en'}
                  insights={aiData}
                  jobs={activeJobsForPdf}
                />
              }
              fileName={`roofback-reporte-${format(now, 'yyyy-MM-dd')}.pdf`}
            >
              {({ loading: pdfLoading }: { loading: boolean }) => (
                <button
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#A8FF3E] bg-[#A8FF3E]/10 hover:bg-[#A8FF3E]/20 border border-[#A8FF3E]/30 rounded-lg py-3 transition-colors"
                  disabled={pdfLoading}
                >
                  <FileDown className="h-4 w-4" />
                  {pdfLoading
                    ? (lang === 'es' ? 'Generando PDF…' : 'Generating PDF…')
                    : (lang === 'es' ? 'Descargar Reporte del Día (PDF)' : 'Download Daily Report (PDF)')}
                </button>
              )}
            </PDFDownloadLink>
          </div>
        )}
      </div>
    </div>
  )
}
