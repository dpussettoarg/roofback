'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { BusinessInsightsResponse } from '@/app/api/ai/business-insights/route'

const BRAND_GREEN = '#A8FF3E'
const DARK_BG = '#0F1117'
const CARD_BG = '#1E2228'
const BORDER = '#2A2D35'
const GRAY = '#6B7280'

interface JobRowData {
  client_name: string
  workflow_stage: string
  estimated_total: number
  actualCost: number
  burnPct: number
  isOverBudget: boolean
}

interface DailyReportProps {
  companyName: string
  generatedAt: string
  lang: 'es' | 'en'
  insights: BusinessInsightsResponse
  jobs: JobRowData[]
  logoUrl?: string
}

const s = StyleSheet.create({
  page: { backgroundColor: DARK_BG, padding: 36, fontFamily: 'Helvetica', color: '#FFFFFF' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  logo: { width: 100, height: 30, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN },
  headerSub: { fontSize: 9, color: GRAY, marginTop: 3 },
  headerCompany: { fontSize: 11, color: '#FFFFFF', marginTop: 2, fontFamily: 'Helvetica-Bold' },

  // Divider
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 14 },

  // Stat cards row
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: BORDER },
  statLabel: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  statValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  statValueGreen: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN },
  statValueRed: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#F87171' },

  // Section headers
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Burn gauge bar
  gaugeWrap: { backgroundColor: CARD_BG, borderRadius: 8, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: BORDER },
  gaugeLabel: { fontSize: 9, color: GRAY, marginBottom: 8 },
  gaugeTrack: { height: 10, backgroundColor: '#0F1117', borderRadius: 5, overflow: 'hidden' },
  gaugeFill: { height: 10, borderRadius: 5 },
  gaugePercLabel: { fontSize: 10, color: '#FFFFFF', marginTop: 5, textAlign: 'right', fontFamily: 'Helvetica-Bold' },

  // Job table
  tableHeader: { flexDirection: 'row', backgroundColor: '#16191F', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tableAlt: { backgroundColor: '#16191F' },
  colClient: { flex: 2.5, fontSize: 9 },
  colStage: { flex: 1.2, fontSize: 9, textAlign: 'center' },
  colMoney: { flex: 1.2, fontSize: 9, textAlign: 'right' },
  colBurn: { flex: 1.2, fontSize: 9, textAlign: 'right' },
  tableHeaderText: { fontSize: 8, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Insight cards
  insightCard: { backgroundColor: CARD_BG, borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3, borderColor: BORDER },
  insightCardRisk: { borderLeftColor: '#F87171' },
  insightCardOpportunity: { borderLeftColor: '#60A5FA' },
  insightCardAction: { borderLeftColor: BRAND_GREEN },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  insightIcon: { fontSize: 13 },
  insightTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  insightBody: { fontSize: 9, color: GRAY, lineHeight: 1.5 },

  // Footer
  footer: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 8, color: GRAY },
  footerBrand: { fontSize: 8, color: BRAND_GREEN, fontFamily: 'Helvetica-Bold' },
})

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function stageBadge(stage: string, lang: 'es' | 'en') {
  const map: Record<string, { es: string; en: string }> = {
    approved: { es: 'Contrato', en: 'Contract' },
    materials_ordered: { es: 'Materiales', en: 'Materials' },
    in_progress: { es: 'En obra', en: 'On-Site' },
    completed: { es: 'Finalizado', en: 'Done' },
  }
  return (lang === 'es' ? map[stage]?.es : map[stage]?.en) ?? stage
}

export function DailyReportPDF({ companyName, generatedAt, lang, insights, jobs, logoUrl }: DailyReportProps) {
  const isEs = lang === 'es'
  const ctx = insights.context
  const burn = Math.min(ctx.burnRate, 100)
  const burnColor = burn > 85 ? '#F87171' : burn > 60 ? '#FBBF24' : BRAND_GREEN

  const dateStr = new Date(generatedAt).toLocaleDateString(isEs ? 'es-US' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ──────────────────────────────────────────── */}
        <View style={s.header}>
          {logoUrl ? (
            <Image src={logoUrl} style={s.logo} />
          ) : (
            <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: BRAND_GREEN }}>RoofBack</Text>
          )}
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>{isEs ? 'Reporte Diario del Negocio' : 'Daily Business Report'}</Text>
            <Text style={s.headerCompany}>{companyName}</Text>
            <Text style={s.headerSub}>{dateStr}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── AI Summary ──────────────────────────────────────── */}
        {insights.summary ? (
          <View style={{ backgroundColor: '#0a1a06', borderRadius: 8, padding: 12, marginBottom: 18, borderWidth: 1, borderColor: `${BRAND_GREEN}40` }}>
            <Text style={{ fontSize: 8, color: BRAND_GREEN, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
              {isEs ? '🤖 Resumen IA' : '🤖 AI Summary'}
            </Text>
            <Text style={{ fontSize: 10, color: '#D1D5DB', lineHeight: 1.5 }}>{insights.summary}</Text>
          </View>
        ) : null}

        {/* ── KPI Stats ──────────────────────────────────────── */}
        <Text style={s.sectionTitle}>{isEs ? 'Indicadores del Día' : "Today's KPIs"}</Text>
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>{isEs ? 'Proyectos Activos' : 'Active Jobs'}</Text>
            <Text style={s.statValue}>{ctx.activeJobs}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>{isEs ? 'Valor Contratado' : 'Contract Value'}</Text>
            <Text style={s.statValueGreen}>{formatMoney(ctx.totalContractValue)}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>{isEs ? 'Gasto Real' : 'Actual Spend'}</Text>
            <Text style={ctx.burnRate > 85 ? s.statValueRed : s.statValue}>{formatMoney(ctx.totalActualCost)}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>{isEs ? 'Hitos Hoy' : 'Milestones Today'}</Text>
            <Text style={ctx.pendingMilestones > 0 ? s.statValueRed : s.statValue}>{ctx.pendingMilestones}</Text>
          </View>
        </View>

        {/* ── Burn Rate Gauge ─────────────────────────────────── */}
        <View style={s.gaugeWrap}>
          <Text style={s.gaugeLabel}>
            {isEs ? `Burn Rate Total — ${ctx.jobsOverBudget} proyecto(s) sobre presupuesto` : `Overall Burn Rate — ${ctx.jobsOverBudget} job(s) over budget`}
          </Text>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeFill, { width: `${burn}%`, backgroundColor: burnColor }]} />
          </View>
          <Text style={[s.gaugePercLabel, { color: burnColor }]}>{burn.toFixed(1)}%</Text>
        </View>

        {/* ── Job Table ───────────────────────────────────────── */}
        {jobs.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{isEs ? 'Estado por Proyecto' : 'Job Status Breakdown'}</Text>
            <View style={s.tableHeader}>
              <Text style={[s.colClient, s.tableHeaderText]}>{isEs ? 'Cliente' : 'Client'}</Text>
              <Text style={[s.colStage, s.tableHeaderText]}>{isEs ? 'Etapa' : 'Stage'}</Text>
              <Text style={[s.colMoney, s.tableHeaderText]}>{isEs ? 'Contrato' : 'Contract'}</Text>
              <Text style={[s.colMoney, s.tableHeaderText]}>{isEs ? 'Gasto' : 'Spent'}</Text>
              <Text style={[s.colBurn, s.tableHeaderText]}>Burn%</Text>
            </View>
            {jobs.map((j, i) => (
              <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableAlt : {}]}>
                <Text style={[s.colClient, { color: '#D1D5DB', fontSize: 9 }]}>{j.client_name}</Text>
                <Text style={[s.colStage, { color: GRAY, fontSize: 9 }]}>{stageBadge(j.workflow_stage, lang)}</Text>
                <Text style={[s.colMoney, { color: '#D1D5DB', fontSize: 9 }]}>{formatMoney(j.estimated_total)}</Text>
                <Text style={[s.colMoney, { color: j.isOverBudget ? '#F87171' : '#D1D5DB', fontSize: 9 }]}>{formatMoney(j.actualCost)}</Text>
                <Text style={[s.colBurn, { color: j.burnPct > 100 ? '#F87171' : j.burnPct > 80 ? '#FBBF24' : BRAND_GREEN, fontSize: 9, fontFamily: 'Helvetica-Bold' }]}>
                  {j.burnPct.toFixed(0)}%
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={s.divider} />

        {/* ── AI Insights ─────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { marginTop: 4 }]}>
          {isEs ? 'Consejos del Asesor IA' : 'AI Advisor Insights'}
        </Text>
        {insights.insights.map((insight, i) => (
          <View key={i} style={[
            s.insightCard,
            insight.type === 'risk' ? s.insightCardRisk :
            insight.type === 'opportunity' ? s.insightCardOpportunity :
            s.insightCardAction,
          ]}>
            <View style={s.insightHeader}>
              <Text style={s.insightIcon}>{insight.icon}</Text>
              <Text style={s.insightTitle}>{insight.title}</Text>
            </View>
            <Text style={s.insightBody}>{insight.body}</Text>
          </View>
        ))}

        {/* ── Footer ──────────────────────────────────────────── */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            {isEs ? `Generado el ${dateStr}` : `Generated on ${dateStr}`}
          </Text>
          <Text style={s.footerBrand}>RoofBack © {new Date().getFullYear()}</Text>
        </View>

      </Page>
    </Document>
  )
}
