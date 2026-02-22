'use client'

/**
 * ProfitChart — isolated Recharts component loaded via dynamic import (ssr: false).
 * Keeping all recharts imports here prevents the "ie is not a function" SSR crash
 * that occurs when recharts runs during server-side rendering.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface DataPoint {
  month: string
  ganancia: number
}

interface ProfitChartProps {
  data: DataPoint[]
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(n)
}

export default function ProfitChart({ data }: ProfitChartProps) {
  // Guard: recharts crashes with empty arrays or undefined widths
  if (!data || data.length === 0) return null

  return (
    // Fixed pixel height prevents width(-1)/height(-1) ResizeObserver errors
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
            width={48}
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
      </ResponsiveContainer>
    </div>
  )
}
