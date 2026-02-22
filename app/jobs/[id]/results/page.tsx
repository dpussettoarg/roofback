'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/context'
import { MobileNav } from '@/components/app/mobile-nav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, CheckCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import type { Job } from '@/lib/types'

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t, lang } = useI18n()
  const supabase = createClient()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  // Estimated
  const [estMaterials, setEstMaterials] = useState(0)
  const [estLabor, setEstLabor] = useState(0)
  const [estOther, setEstOther] = useState(0)

  // Actual
  const [actMaterials, setActMaterials] = useState(0)
  const [actLabor, setActLabor] = useState(0)
  const [actExpenses, setActExpenses] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', id).single()
      if (!jobData) return
      setJob(jobData as Job)

      // Estimated items
      const { data: items } = await supabase.from('estimate_items').select('*').eq('job_id', id)
      if (items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const typedItems = items as any[]
        setEstMaterials(typedItems.filter((i: any) => i.category === 'material').reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0))
        setEstLabor(typedItems.filter((i: any) => i.category === 'labor').reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0))
        setEstOther(typedItems.filter((i: any) => i.category === 'other').reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0))
      }

      // Actual materials (from checklist)
      const { data: checklist } = await supabase.from('material_checklist').select('*').eq('job_id', id)
      if (checklist) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const totalActualMat = (checklist as any[]).reduce((s: number, c: any) => s + (Number(c.actual_cost) || 0), 0)
        setActMaterials(totalActualMat)
      }

      // Actual labor (from time entries)
      const { data: timeEntries } = await supabase.from('time_entries').select('*').eq('job_id', id)
      if (timeEntries) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActLabor((timeEntries as any[]).reduce((s: number, te: any) => s + Number(te.hours) * Number(te.hourly_rate), 0))
      }

      // Actual expenses
      const { data: expenses } = await supabase.from('expenses').select('*').eq('job_id', id)
      if (expenses) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActExpenses((expenses as any[]).reduce((s: number, e: any) => s + Number(e.amount), 0))
      }

      setLoading(false)
    }
    load()
  }, [id, supabase])

  const calc = useMemo(() => {
    const estCost = estMaterials + estLabor + estOther
    const actCost = actMaterials + actLabor + actExpenses
    const charged = Number(job?.estimated_total) || 0
    const estProfit = charged - estCost
    const actProfit = charged - actCost
    const estMargin = charged > 0 ? (estProfit / charged) * 100 : 0
    const actMargin = charged > 0 ? (actProfit / charged) * 100 : 0
    return { estCost, actCost, charged, estProfit, actProfit, estMargin, actMargin }
  }, [estMaterials, estLabor, estOther, actMaterials, actLabor, actExpenses, job])

  async function markComplete() {
    await supabase.from('jobs').update({
      status: 'completed',
      actual_total: calc.actCost,
      profit: calc.actProfit,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    toast.success(lang === 'es' ? '¡Trabajo marcado como terminado!' : 'Job marked as completed!')
    router.push(`/jobs/${id}`)
  }

  async function markInProgress() {
    await supabase.from('jobs').update({
      status: 'in_progress',
      completed_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    toast.success(lang === 'es' ? 'Volvió a en progreso' : 'Back to in progress')
    router.refresh()
  }

  function diffColor(est: number, act: number) {
    if (act === 0) return 'text-[#6B7280]'
    const diff = est - act
    if (diff > 0) return 'text-[#A8FF3E]'
    if (diff < 0) return 'text-[#EF4444]'
    return 'text-[#6B7280]'
  }

  function diffIcon(est: number, act: number) {
    if (act === 0) return <Minus className="h-4 w-4 text-[#6B7280]" />
    const diff = est - act
    if (diff > 0) return <TrendingDown className="h-4 w-4 text-[#A8FF3E]" />
    if (diff < 0) return <TrendingUp className="h-4 w-4 text-[#EF4444]" />
    return <Minus className="h-4 w-4 text-[#6B7280]" />
  }

  // RED when actual expenses exceed the contract price (losing money)
  const isOverBudget = calc.actCost > calc.charged && calc.charged > 0
  const profitColor = calc.actProfit > 0 ? 'text-[#A8FF3E]' : calc.actProfit < 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'
  const profitBg    = calc.actProfit > 0 ? 'bg-[#A8FF3E]/10 border-[#A8FF3E]/30' : calc.actProfit < 0 ? 'bg-[#EF4444]/10 border-[#EF4444]/30' : 'bg-[#F59E0B]/10 border-[#F59E0B]/30'
  const profitMessage = calc.actProfit > 200 ? t('results.great') : calc.actProfit >= 0 ? t('results.ok') : t('results.bad')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2A2D35] border-t-[#A8FF3E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] pb-24">
      <div className="mx-auto max-w-[430px]">
        <div className="border-b border-[#2A2D35] px-4 pt-12 pb-4">
          <Link href={`/jobs/${id}`} className="inline-flex items-center text-sm text-[#6B7280] mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            {job?.client_name}
          </Link>
          <h1 className="text-2xl font-bold text-white">{t('results.title')}</h1>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Profit indicator */}
          <Card className={`border shadow-md ${profitBg} bg-[#1E2228]`} style={{ backgroundColor: undefined }}>
            <CardContent className="p-5 text-center">
              {isOverBudget && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF4444] text-white text-xs font-bold mb-3">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {lang === 'es' ? '⚠ PÉRDIDA — Gastos superiores al contrato' : '⚠ LOSS — Expenses exceed contract price'}
                </div>
              )}
              <p className={`text-4xl font-bold ${profitColor}`}>
                {formatMoney(calc.actProfit)}
              </p>
              <p className={`text-lg font-semibold ${profitColor} mt-1`}>
                {calc.actMargin.toFixed(1)}% {lang === 'es' ? 'margen' : 'margin'}
              </p>
              {/* Formula display */}
              <p className="text-xs text-[#6B7280] mt-2">
                {lang === 'es'
                  ? `Precio contrato (${formatMoney(calc.charged)}) − Gastos reales (${formatMoney(calc.actCost)})`
                  : `Contract price (${formatMoney(calc.charged)}) − Actual costs (${formatMoney(calc.actCost)})`}
              </p>
              <p className="text-sm text-[#6B7280] mt-1">{profitMessage}</p>
            </CardContent>
          </Card>

          {/* Comparison table */}
          <Card className="border border-[#2A2D35] bg-[#1E2228] shadow-md">
            <CardContent className="p-4">
              {/* Header */}
              <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-[#6B7280] mb-3 pb-2 border-b border-[#2A2D35]">
                <span>{t('results.concept')}</span>
                <span className="text-right">{t('results.estimated')}</span>
                <span className="text-right">{t('results.actual')}</span>
                <span className="text-right">{t('results.diff')}</span>
              </div>

              {/* Materials */}
              <div className="grid grid-cols-4 gap-2 text-sm py-2 border-b border-[#2A2D35]">
                <span className="text-[#6B7280]">{t('results.materials')}</span>
                <span className="text-right text-white">{formatMoney(estMaterials)}</span>
                <span className="text-right text-white">{formatMoney(actMaterials)}</span>
                <span className={`text-right flex items-center justify-end gap-1 ${diffColor(estMaterials, actMaterials)}`}>
                  {diffIcon(estMaterials, actMaterials)}
                  {formatMoney(estMaterials - actMaterials)}
                </span>
              </div>

              {/* Labor */}
              <div className="grid grid-cols-4 gap-2 text-sm py-2 border-b border-[#2A2D35]">
                <span className="text-[#6B7280]">{t('results.labor')}</span>
                <span className="text-right text-white">{formatMoney(estLabor)}</span>
                <span className="text-right text-white">{formatMoney(actLabor)}</span>
                <span className={`text-right flex items-center justify-end gap-1 ${diffColor(estLabor, actLabor)}`}>
                  {diffIcon(estLabor, actLabor)}
                  {formatMoney(estLabor - actLabor)}
                </span>
              </div>

              {/* Extras */}
              <div className="grid grid-cols-4 gap-2 text-sm py-2 border-b border-[#2A2D35]">
                <span className="text-[#6B7280]">{t('results.extras')}</span>
                <span className="text-right text-white">{formatMoney(estOther)}</span>
                <span className="text-right text-white">{formatMoney(actExpenses)}</span>
                <span className={`text-right flex items-center justify-end gap-1 ${diffColor(estOther, actExpenses)}`}>
                  {diffIcon(estOther, actExpenses)}
                  {formatMoney(estOther - actExpenses)}
                </span>
              </div>

              <Separator className="my-2 bg-[#2A2D35]" />

              {/* Total cost */}
              <div className="grid grid-cols-4 gap-2 text-sm py-2 font-semibold text-white">
                <span>{t('results.totalCost')}</span>
                <span className="text-right">{formatMoney(calc.estCost)}</span>
                <span className="text-right">{formatMoney(calc.actCost)}</span>
                <span className={`text-right ${diffColor(calc.estCost, calc.actCost)}`}>
                  {formatMoney(calc.estCost - calc.actCost)}
                </span>
              </div>

              {/* Charged */}
              <div className="grid grid-cols-4 gap-2 text-sm py-2 bg-[#0F1117] rounded px-2">
                <span className="font-semibold text-white col-span-2">{t('results.charged')}</span>
                <span className="text-right font-semibold text-white col-span-2">{formatMoney(calc.charged)}</span>
              </div>

              <Separator className="my-2 bg-[#2A2D35]" />

              {/* Profit */}
              <div className={`grid grid-cols-4 gap-2 text-sm py-3 font-bold ${profitColor}`}>
                <span>{t('results.profit')}</span>
                <span className="text-right">{formatMoney(calc.estCost > 0 ? calc.charged - calc.estCost : 0)}</span>
                <span className="text-right">{formatMoney(calc.actProfit)}</span>
                <span></span>
              </div>

              {/* Margin */}
              <div className={`grid grid-cols-4 gap-2 text-sm py-1 font-bold ${profitColor}`}>
                <span>{t('results.margin')}</span>
                <span className="text-right">{calc.estCost > 0 ? ((calc.charged - calc.estCost) / calc.charged * 100).toFixed(1) : '0'}%</span>
                <span className="text-right">{calc.actMargin.toFixed(1)}%</span>
                <span></span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {job?.status !== 'completed' ? (
            <Button
              onClick={markComplete}
              className="btn-lime w-full h-14 text-lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              {t('results.markComplete')}
            </Button>
          ) : (
            <Button onClick={markInProgress} variant="outline" className="w-full h-12 border-[#2A2D35] bg-transparent text-white hover:bg-[#1E2228]">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('results.backToProgress')}
            </Button>
          )}
        </div>
      </div>

      <MobileNav />
    </div>
  )
}
