'use client'

/**
 * ProfitChart — fully isolated Recharts component.
 *
 * Loaded exclusively via:
 *   const ProfitChart = dynamic(() => import('@/components/app/profit-chart'), { ssr: false })
 *
 * Root-cause of "ie is not a function" + "width(-1)/height(-1)":
 *   ResponsiveContainer calls getBoundingClientRect() synchronously on mount.
 *   When the element hasn't painted yet, width is -1 and recharts' internal
 *   scale function ("ie") blows up.
 *
 * Fix strategy:
 *   1. Gate render behind useEffect (guarantees DOM is painted).
 *   2. Skip ResponsiveContainer entirely — pass fixed width/height props
 *      directly to BarChart. 100% width is set via the wrapping div.
 *   3. Hard data guard before any recharts JSX.
 */

import { useEffect, useRef, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell,
} from 'recharts'

interface DataPoint {
  month: string
  ganancia: number
}

interface ProfitChartProps {
  data: DataPoint[]
}

const CHART_HEIGHT = 200

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

export default function ProfitChart({ data }: ProfitChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState<number>(0)
  const [mounted, setMounted] = useState(false)

  // Step 1 — wait for the DOM to be fully painted before any recharts work
  useEffect(() => {
    setMounted(true)
  }, [])

  // Step 2 — measure the real pixel width after mount
  useEffect(() => {
    if (!mounted || !containerRef.current) return

    const measure = () => {
      const w = containerRef.current?.offsetWidth ?? 0
      if (w > 0) setChartWidth(w)
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [mounted])

  // Step 3 — hard data guard
  const hasData = Array.isArray(data) && data.length > 0 && data.some((d) => d.ganancia !== 0)

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: CHART_HEIGHT }}
    >
      {/* Only render when: DOM is painted, width is measured, data exists */}
      {mounted && chartWidth > 0 && hasData && (
        <BarChart
          width={chartWidth}
          height={CHART_HEIGHT}
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2D35" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickFormatter={(v) => `$${v}`}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            formatter={(v) => [formatMoney(Number(v)), 'Profit']}
            labelFormatter={(l) => String(l)}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #2A2D35',
              background: '#1E2228',
              color: '#fff',
              fontSize: 12,
            }}
            cursor={{ fill: 'rgba(168,255,62,0.05)' }}
          />
          <Bar dataKey="ganancia" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.ganancia < 0 ? '#F87171' : '#A8FF3E'}
              />
            ))}
          </Bar>
        </BarChart>
      )}

      {/* Placeholder shown while measuring or when no data */}
      {(!mounted || chartWidth === 0 || !hasData) && (
        <div className="w-full h-full flex items-end gap-1 px-2 pb-2">
          {[40, 65, 30, 80, 55, 90].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-[#2A2D35] animate-pulse"
              style={{ height: `${h}%`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
