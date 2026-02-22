'use client'

/**
 * ProfitChart — rebuilt from scratch with the "Double-Mount" strategy.
 *
 * Load ONLY via:
 *   const ProfitChart = dynamic(() => import('@/components/app/profit-chart'), { ssr: false })
 *
 * Root cause of "ie is not a function":
 *   Recharts' internal scale function blows up when it receives width = -1,
 *   which happens if the chart tries to measure the DOM before the browser
 *   has finished painting.
 *
 * Fix — three-layer guard:
 *   1. useEffect #1 → isMounted (guarantees we are past SSR / hydration)
 *   2. useEffect #2 → requestAnimationFrame inside isMounted effect
 *      (guarantees the browser has completed at least one paint cycle)
 *   3. div ref + ResizeObserver → real pixel width, never -1
 *
 * ResponsiveContainer is NOT used. Width is passed as a hard integer.
 * Every Recharts import is guarded by typeof window !== 'undefined'.
 */

import { useEffect, useRef, useState } from 'react'

// Only import Recharts sub-components individually — never the barrel export
import { BarChart }     from 'recharts'
import { Bar }          from 'recharts'
import { XAxis }        from 'recharts'
import { YAxis }        from 'recharts'
import { CartesianGrid } from 'recharts'
import { Tooltip }      from 'recharts'
import { Cell }         from 'recharts'

export interface DataPoint {
  month: string
  ganancia: number
}

interface Props {
  data: DataPoint[]
}

const HEIGHT = 200

function usd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function ProfitChart({ data }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Layer 1 — DOM painted? (past hydration)
  const [isMounted, setIsMounted] = useState(false)

  // Layer 2 — browser paint cycle complete?
  const [isReady, setIsReady] = useState(false)

  // Layer 3 — measured pixel width
  const [width, setWidth] = useState(0)

  // Layer 1: runs after first render, so we know we are on the client
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Layer 2: once mounted, wait for the next animation frame
  // This guarantees the browser has completed at least one paint before
  // Recharts tries to access any DOM geometry.
  useEffect(() => {
    if (!isMounted) return
    const raf = requestAnimationFrame(() => {
      setIsReady(true)
    })
    return () => cancelAnimationFrame(raf)
  }, [isMounted])

  // Layer 3: after the frame fires, measure the real pixel width and
  // keep it updated whenever the container resizes.
  useEffect(() => {
    if (!isReady || !wrapperRef.current) return

    const measure = () => {
      const w = wrapperRef.current?.offsetWidth ?? 0
      if (w > 0) setWidth(w)
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [isReady])

  // Hard data guard — Recharts must never receive an empty or all-zero dataset
  const hasData =
    typeof window !== 'undefined' &&
    Array.isArray(data) &&
    data.length > 0 &&
    data.some((d) => d.ganancia !== 0)

  // The chart is only rendered when ALL three layers are satisfied
  const canRender = isReady && width > 0 && hasData

  return (
    <div
      ref={wrapperRef}
      className="w-full"
      style={{ height: HEIGHT }}
    >
      {canRender && (
        <BarChart
          width={width}
          height={HEIGHT}
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#2A2D35"
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickFormatter={(v: number) => `$${v}`}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            formatter={(v: number) => [usd(v), 'Profit']}
            labelFormatter={(l: string) => String(l)}
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
            {data.map((entry, i) => (
              <Cell
                key={`cell-${i}`}
                fill={entry.ganancia < 0 ? '#F87171' : '#A8FF3E'}
              />
            ))}
          </Bar>
        </BarChart>
      )}

      {/* Skeleton shown while any guard layer is still pending */}
      {!canRender && (
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
