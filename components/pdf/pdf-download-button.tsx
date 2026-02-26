'use client'

/**
 * PdfDownloadButton — the ONLY file in the codebase that statically imports
 * @react-pdf/renderer. It must NEVER be imported directly anywhere; it is
 * always loaded via:
 *
 *   dynamic(() => import('@/components/pdf/pdf-download-button'), { ssr: false })
 *
 * This double-dynamic boundary (dashboard → ai-advisor-card → this file) is
 * what prevents webpack from reaching @react-pdf/renderer during its server-
 * side build pass, which would fail with "ESM packages need to be imported".
 */

import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { DailyReportPDF } from '@/components/pdf/daily-report-pdf'
import type { BusinessInsightsResponse } from '@/app/api/ai/business-insights/route'

interface JobRowData {
  client_name: string
  workflow_stage: string
  estimated_total: number
  actualCost: number
  burnPct: number
  isOverBudget: boolean
}

interface Props {
  companyName: string
  generatedAt: string
  lang: 'es' | 'en'
  insights: BusinessInsightsResponse
  jobs: JobRowData[]
}

export default function PdfDownloadButton({ companyName, generatedAt, lang, insights, jobs }: Props) {
  const now = new Date()
  return (
    <PDFDownloadLink
      document={
        <DailyReportPDF
          companyName={companyName}
          generatedAt={generatedAt}
          lang={lang}
          insights={insights}
          jobs={jobs}
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
  )
}
