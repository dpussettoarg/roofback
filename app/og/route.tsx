import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? 'RoofBack'
  const sub = searchParams.get('sub') ?? 'Software de Roofing por Techistas con 20 años de Experiencia'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0F1117',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(168,255,62,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(168,255,62,0.06) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Top glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(168,255,62,0.18) 0%, transparent 70%)',
          }}
        />

        {/* Left panel — copy */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '55%',
            height: '100%',
            padding: '60px 48px 60px 64px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#A8FF3E', letterSpacing: '-1px' }}>
              ROOF
            </span>
            <span style={{ fontSize: 28, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-1px' }}>
              BACK
            </span>
            <div
              style={{
                marginLeft: 14,
                padding: '4px 10px',
                borderRadius: 20,
                border: '1px solid rgba(168,255,62,0.35)',
                backgroundColor: 'rgba(168,255,62,0.12)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#A8FF3E' }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#A8FF3E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                20 años en el techo
              </span>
            </div>
          </div>

          <div style={{ fontSize: 42, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 20 }}>
            {title}
          </div>

          <div style={{ fontSize: 19, color: '#9CA3AF', lineHeight: 1.5, marginBottom: 36, maxWidth: 460 }}>
            {sub}
          </div>

          {/* CTA pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 28px',
              backgroundColor: '#A8FF3E',
              borderRadius: 50,
              width: 'fit-content',
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 900, color: '#0F1117' }}>
              Probá la Bestia — 14 días gratis
            </span>
          </div>
        </div>

        {/* Right panel — mock dashboard */}
        <div
          style={{
            position: 'absolute',
            right: 48,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 420,
            backgroundColor: '#1E2228',
            borderRadius: 20,
            border: '1px solid #2A2D35',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Dashboard header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #2A2D35',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: '#6B7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Owner Dashboard
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#A8FF3E',
                backgroundColor: 'rgba(168,255,62,0.12)',
                padding: '3px 8px',
                borderRadius: 10,
              }}
            >
              Live
            </div>
          </div>

          {/* KPI row */}
          <div style={{ display: 'flex', padding: '14px 14px 0', gap: 10 }}>
            {[
              { label: 'Proyectos', value: '4', color: '#A8FF3E' },
              { label: 'Burn Rate', value: '72%', color: '#FBBF24' },
              { label: 'Hitos Hoy', value: '2', color: '#F87171' },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  flex: 1,
                  backgroundColor: '#16191F',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: 9, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {k.label}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Job rows with traffic light */}
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { client: 'Rivera Roofing', value: '$14,200', burn: 62, light: '#A8FF3E', pct: '62%' },
              { client: 'Sunset Metal Co.', value: '$8,950', burn: 91, light: '#F87171', pct: '91%' },
              { client: 'A&M Contractors', value: '$22,000', burn: 31, light: '#A8FF3E', pct: '31%' },
            ].map((job) => (
              <div
                key={job.client}
                style={{
                  backgroundColor: '#16191F',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF' }}>{job.client}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FFFFFF' }}>{job.value}</span>
                    <div
                      style={{
                        padding: '2px 8px',
                        borderRadius: 20,
                        backgroundColor: `${job.light}20`,
                        border: `1px solid ${job.light}50`,
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: job.light }}>{job.pct}</span>
                    </div>
                  </div>
                </div>
                {/* Bar */}
                <div style={{ height: 5, backgroundColor: '#0F1117', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${job.burn}%`,
                      backgroundColor: job.light,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Advisor teaser */}
          <div
            style={{
              margin: '0 14px 14px',
              backgroundColor: '#0d1f0a',
              border: '1px solid rgba(168,255,62,0.2)',
              borderRadius: 10,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ fontSize: 9, color: '#A8FF3E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              🧠 AI Business Advisor — Claude
            </div>
            <div style={{ fontSize: 11, color: '#D1D5DB', lineHeight: 1.4 }}>
              Sunset Metal Co. está al 91% del presupuesto. Revisá mano de obra antes del turno.
            </div>
          </div>
        </div>

        {/* Bottom watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            left: 64,
            fontSize: 12,
            color: '#374151',
          }}
        >
          roofback.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
