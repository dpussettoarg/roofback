import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

export interface BusinessInsight {
  type: 'risk' | 'opportunity' | 'action'
  icon: '⚠️' | '💡' | '✅'
  title: string
  body: string
}

export interface BusinessInsightsResponse {
  insights: BusinessInsight[]
  summary: string
  generatedAt: string
  source: 'ai' | 'fallback'
  context: {
    activeJobs: number
    totalContractValue: number
    totalActualCost: number
    burnRate: number        // actual / contract %
    jobsOverBudget: number
    jobsOnTrack: number
    pendingMilestones: number
  }
}

interface ActiveJobData {
  id: string
  client_name: string
  workflow_stage: string
  estimated_total: number
  simple_materials_budget: number
  simple_labor_budget: number
  simple_other_budget: number
  start_date: string | null
  deadline_date: string | null
  client_status: string
}

interface MilestoneRow {
  job_id: string
  stage: string
  scheduled_date: string | null
  completed_date: string | null
}

interface ChecklistRow {
  job_id: string
  actual_cost: number | null
  is_checked: boolean
}

interface TimeEntryRow {
  job_id: string
  hours: number
  hourly_rate: number
}

interface ExpenseRow {
  job_id: string
  amount: number
}

function fallbackInsights(context: BusinessInsightsResponse['context'], lang: string): BusinessInsight[] {
  const isEs = lang === 'es'
  const insights: BusinessInsight[] = []

  if (context.burnRate > 85) {
    insights.push({
      type: 'risk',
      icon: '⚠️',
      title: isEs ? 'Alerta de presupuesto' : 'Budget Alert',
      body: isEs
        ? `El gasto real ya es el ${context.burnRate.toFixed(0)}% del valor contratado en proyectos activos. Revisá los costos de materiales y horas esta semana.`
        : `Actual spend is already ${context.burnRate.toFixed(0)}% of contracted value on active jobs. Review material costs and labor hours this week.`,
    })
  }

  if (context.jobsOverBudget > 0) {
    insights.push({
      type: 'risk',
      icon: '⚠️',
      title: isEs ? 'Proyectos sobre presupuesto' : 'Jobs Over Budget',
      body: isEs
        ? `${context.jobsOverBudget} proyecto(s) superaron el presupuesto estimado. Coordiná una revisión con el equipo antes del próximo turno.`
        : `${context.jobsOverBudget} job(s) have exceeded their estimated budget. Schedule a team review before the next shift.`,
    })
  }

  if (context.pendingMilestones > 0) {
    insights.push({
      type: 'action',
      icon: '✅',
      title: isEs ? 'Hitos pendientes hoy' : 'Pending Milestones Today',
      body: isEs
        ? `Hay ${context.pendingMilestones} hito(s) programado(s) para hoy. Confirmá fechas con los clientes y actualizá el cronograma.`
        : `There are ${context.pendingMilestones} milestone(s) scheduled for today. Confirm dates with clients and update the schedule.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'opportunity',
      icon: '💡',
      title: isEs ? 'Seguimiento proactivo' : 'Proactive Follow-Up',
      body: isEs
        ? `Con ${context.activeJobs} proyecto(s) activo(s), es buen momento para enviar actualizaciones de estado a los clientes y reforzar la confianza.`
        : `With ${context.activeJobs} active job(s), now is a great time to send status updates to clients and reinforce trust.`,
    })
  }

  // Always add one opportunity tip
  if (insights.length < 3) {
    insights.push({
      type: 'opportunity',
      icon: '💡',
      title: isEs ? 'Oportunidad de upsell' : 'Upsell Opportunity',
      body: isEs
        ? 'Los techos aprobados son el mejor momento para ofrecer mantenimiento preventivo anual. Mencionáselo al cliente al momento del cierre.'
        : 'Approved roofs are the best moment to offer annual preventive maintenance. Mention it to the client at close.',
    })
  }

  return insights.slice(0, 3)
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { lang?: string; orgId?: string }
    const lang = body.lang || 'en'

    // Get org context
    const { data: prof } = await supabase
      .from('profiles')
      .select('organization_id, language_preference')
      .eq('id', user.id)
      .single()

    const orgId = body.orgId || prof?.organization_id

    // ── 1. Fetch active jobs ──────────────────────────────────────────────
    let jobQuery = supabase
      .from('jobs')
      .select('id,client_name,workflow_stage,estimated_total,simple_materials_budget,simple_labor_budget,simple_other_budget,start_date,deadline_date,client_status')
      .not('client_status', 'eq', 'rejected')
      .not('status', 'eq', 'completed')

    if (orgId) {
      jobQuery = jobQuery.eq('organization_id', orgId)
    } else {
      jobQuery = jobQuery.eq('user_id', user.id)
    }

    const { data: activeJobs } = await jobQuery
    const jobs = (activeJobs as ActiveJobData[]) || []
    const jobIds = jobs.map((j) => j.id)

    // ── 2. Fetch milestones ───────────────────────────────────────────────
    let milestones: MilestoneRow[] = []
    if (jobIds.length > 0) {
      const { data: ms } = await supabase
        .from('job_milestones')
        .select('job_id,stage,scheduled_date,completed_date')
        .in('job_id', jobIds)
      milestones = (ms as MilestoneRow[]) || []
    }

    // ── 3. Fetch actual costs ─────────────────────────────────────────────
    let actualCostByJob: Record<string, number> = {}
    if (jobIds.length > 0) {
      const [{ data: chk }, { data: te }, { data: exp }] = await Promise.all([
        supabase.from('material_checklist').select('job_id,actual_cost,is_checked').in('job_id', jobIds),
        supabase.from('time_entries').select('job_id,hours,hourly_rate').in('job_id', jobIds),
        supabase.from('expenses').select('job_id,amount').in('job_id', jobIds),
      ])

      for (const j of jobs) {
        const matCost = ((chk as ChecklistRow[]) || []).filter(c => c.job_id === j.id).reduce((s, c) => s + (Number(c.actual_cost) || 0), 0)
        const laborCost = ((te as TimeEntryRow[]) || []).filter(e => e.job_id === j.id).reduce((s, e) => s + Number(e.hours) * Number(e.hourly_rate), 0)
        const expCost = ((exp as ExpenseRow[]) || []).filter(e => e.job_id === j.id).reduce((s, e) => s + Number(e.amount), 0)
        actualCostByJob[j.id] = matCost + laborCost + expCost
      }
    }

    // ── 4. Compute context metrics ────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    const totalContractValue = jobs.reduce((s, j) => s + Number(j.estimated_total), 0)
    const totalActualCost = Object.values(actualCostByJob).reduce((s, v) => s + v, 0)
    const burnRate = totalContractValue > 0 ? (totalActualCost / totalContractValue) * 100 : 0

    const jobsOverBudget = jobs.filter((j) => {
      const budget = Number(j.simple_materials_budget) + Number(j.simple_labor_budget) + Number(j.simple_other_budget)
      return budget > 0 && (actualCostByJob[j.id] || 0) > budget
    }).length

    const pendingMilestones = milestones.filter(
      (m) => m.scheduled_date === today && !m.completed_date
    ).length

    const context: BusinessInsightsResponse['context'] = {
      activeJobs: jobs.length,
      totalContractValue,
      totalActualCost,
      burnRate,
      jobsOverBudget,
      jobsOnTrack: jobs.length - jobsOverBudget,
      pendingMilestones,
    }

    const generatedAt = new Date().toISOString()

    // ── 5. Build job summaries for AI ─────────────────────────────────────
    const jobSummaries = jobs.map((j) => {
      const budget = Number(j.simple_materials_budget) + Number(j.simple_labor_budget) + Number(j.simple_other_budget)
      const actual = actualCostByJob[j.id] || 0
      const overBudget = budget > 0 && actual > budget
      const jobMilestones = milestones.filter((m) => m.job_id === j.id)
      const pendingMs = jobMilestones.filter((m) => m.scheduled_date && !m.completed_date)
      return {
        client: j.client_name,
        stage: j.workflow_stage,
        contract: Number(j.estimated_total),
        budget,
        actual,
        overBudget,
        deadline: j.deadline_date,
        pendingMilestones: pendingMs.map((m) => m.stage),
      }
    })

    // ── 6. Call Anthropic Claude ──────────────────────────────────────────
    if (ANTHROPIC_API_KEY && jobs.length > 0) {
      const isEs = lang === 'es'

      const systemPrompt = isEs
        ? `Sos un asesor de negocios experto en la industria de roofing (techado) en Estados Unidos. Tu rol es analizar los datos operativos de la empresa y dar consejos concretos, accionables y directos. Respondé siempre en español. Máximo 3 insights. Formato JSON estricto.`
        : `You are a business advisor expert in the US roofing industry. Your role is to analyze operational company data and give concrete, actionable, direct advice. Always respond in English. Maximum 3 insights. Strict JSON format.`

      const userPrompt = isEs
        ? `Analizá estos datos de hoy de una empresa de roofing:

RESUMEN EJECUTIVO:
- Proyectos activos: ${context.activeJobs}
- Valor total contratado: $${context.totalContractValue.toFixed(0)}
- Gasto real acumulado: $${context.totalActualCost.toFixed(0)}
- Burn rate: ${context.burnRate.toFixed(1)}%
- Proyectos sobre presupuesto: ${context.jobsOverBudget}
- Hitos pendientes hoy: ${context.pendingMilestones}

DETALLE POR PROYECTO:
${jobSummaries.map((j, i) => `${i + 1}. ${j.client} | Etapa: ${j.stage} | Contrato: $${j.contract} | Gasto: $${j.actual}${j.overBudget ? ' [SOBRE PRESUPUESTO]' : ''} | Hitos pendientes: ${j.pendingMilestones.join(', ') || 'ninguno'}`).join('\n')}

Identificá cuellos de botella, riesgos de sobrecosto o retrasos. Devolvé exactamente este JSON:
{
  "summary": "Resumen ejecutivo en 1 oración",
  "insights": [
    {"type": "risk|opportunity|action", "icon": "⚠️|💡|✅", "title": "Título corto", "body": "Consejo accionable en 2 oraciones máximo"},
    {"type": "risk|opportunity|action", "icon": "⚠️|💡|✅", "title": "Título corto", "body": "Consejo accionable en 2 oraciones máximo"},
    {"type": "risk|opportunity|action", "icon": "⚠️|💡|✅", "title": "Título corto", "body": "Consejo accionable en 2 oraciones máximo"}
  ]
}`
        : `Analyze today's data for a roofing company:

EXECUTIVE SUMMARY:
- Active jobs: ${context.activeJobs}
- Total contracted value: $${context.totalContractValue.toFixed(0)}
- Actual cumulative spend: $${context.totalActualCost.toFixed(0)}
- Burn rate: ${context.burnRate.toFixed(1)}%
- Jobs over budget: ${context.jobsOverBudget}
- Pending milestones today: ${context.pendingMilestones}

PER-JOB DETAIL:
${jobSummaries.map((j, i) => `${i + 1}. ${j.client} | Stage: ${j.stage} | Contract: $${j.contract} | Spent: $${j.actual}${j.overBudget ? ' [OVER BUDGET]' : ''} | Pending milestones: ${j.pendingMilestones.join(', ') || 'none'}`).join('\n')}

Identify bottlenecks, cost overrun risks, or schedule delays. Return exactly this JSON:
{
  "summary": "Executive summary in 1 sentence",
  "insights": [
    {"type": "risk|opportunity|action", "icon": "⚠️|💡|✅", "title": "Short title", "body": "Actionable advice in max 2 sentences"},
    {"type": "risk|opportunity|action", "icon": "⚠️|💡|✅", "title": "Short title", "body": "Actionable advice in max 2 sentences"},
    {"type": "risk|opportunity|action", "icon": "⚠️|💡|✅", "title": "Short title", "body": "Actionable advice in max 2 sentences"}
  ]
}`

      try {
        const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        })

        if (aiRes.ok) {
          const aiData = await aiRes.json()
          const raw = aiData.content?.[0]?.text?.trim()
          if (raw) {
            // Extract JSON from Claude's response (it may wrap it in markdown)
            const jsonMatch = raw.match(/\{[\s\S]*\}/)
            const jsonStr = jsonMatch ? jsonMatch[0] : raw
            const parsed = JSON.parse(jsonStr) as { summary: string; insights: BusinessInsight[] }
            return NextResponse.json({
              insights: parsed.insights?.slice(0, 3) || fallbackInsights(context, lang),
              summary: parsed.summary || '',
              generatedAt,
              source: 'ai',
              context,
            } satisfies BusinessInsightsResponse)
          }
        } else {
          const errText = await aiRes.text()
          console.error('[business-insights] Anthropic error:', errText)
        }
      } catch {
        // fall through to fallback
      }
    }

    // ── 7. Fallback (no key or no jobs) ───────────────────────────────────
    const isEs = lang === 'es'
    const summary = jobs.length === 0
      ? (isEs ? 'No hay proyectos activos para analizar hoy.' : 'No active jobs to analyze today.')
      : (isEs
        ? `${context.activeJobs} proyecto(s) activo(s) con un burn rate del ${context.burnRate.toFixed(0)}%.`
        : `${context.activeJobs} active job(s) with a ${context.burnRate.toFixed(0)}% burn rate.`)

    return NextResponse.json({
      insights: fallbackInsights(context, lang),
      summary,
      generatedAt,
      source: 'fallback',
      context,
    } satisfies BusinessInsightsResponse)

  } catch (err: unknown) {
    console.error('[business-insights]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
