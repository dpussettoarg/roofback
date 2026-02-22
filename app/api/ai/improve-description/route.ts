import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// ── In-memory rate limiter (per user ID, resets on cold start) ────────────────
// For production scale, replace with Redis/Upstash. This covers 99% of abuse cases
// in a single-region serverless deployment.
const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10          // max requests
const RATE_WINDOW_MS = 60_000  // per 60 seconds

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

// ── Input sanitization — strip prompt injection attempts ─────────────────────
function sanitizeForPrompt(input: string, maxLen = 1000): string {
  return input
    .slice(0, maxLen)
    .replace(/[<>]/g, '')                                    // strip HTML tags
    .replace(/\bignore\b.{0,40}\binstruction/gi, '')         // prompt injection patterns
    .replace(/\bsystem\s*prompt\b/gi, '')
    .replace(/\b(jailbreak|DAN|pretend you are)\b/gi, '')
    .trim()
}

// ── Allowlists for enum inputs ────────────────────────────────────────────────
const VALID_JOB_TYPES = new Set(['repair', 'reroof', 'new_roof', 'gutters', 'waterproofing', 'other'])
const VALID_ROOF_TYPES = new Set(['shingle', 'tile', 'metal', 'flat', 'other'])

interface RequestBody {
  description: string
  jobType: string
  roofType: string
  squareFootage: number
  language: 'es' | 'en'
}

export async function POST(req: NextRequest) {
  try {
    // ── AUTHENTICATION (was missing — critical vulnerability fixed) ───────────
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── RATE LIMITING ─────────────────────────────────────────────────────────
    if (isRateLimited(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // ── INPUT VALIDATION & SANITIZATION ──────────────────────────────────────
    const body = (await req.json()) as RequestBody
    const { squareFootage, language } = body

    const description = sanitizeForPrompt(body.description || '', 800)
    const jobType = VALID_JOB_TYPES.has(body.jobType) ? body.jobType : 'other'
    const roofType = VALID_ROOF_TYPES.has(body.roofType) ? body.roofType : 'other'
    const sqft = typeof squareFootage === 'number' && squareFootage >= 0 && squareFootage <= 100000
      ? squareFootage : 0

    if (!description || description.length < 5) {
      return NextResponse.json(
        { error: language === 'es' ? 'Escribí al menos una descripción breve' : 'Write at least a brief description first' },
        { status: 400 }
      )
    }

    // ── CALL ANTHROPIC ────────────────────────────────────────────────────────
    if (ANTHROPIC_API_KEY) {
      const langInstruction = language === 'es'
        ? 'IMPORTANTE: Escribí toda la propuesta en español. NO incluyas texto en inglés.'
        : 'IMPORTANT: Write the entire proposal in English. Do NOT include any Spanish text.'

      const systemPrompt = language === 'es'
        ? `Sos un presupuestista profesional de techos en Estados Unidos. Mejorá y completá la siguiente descripción de trabajo para que suene profesional, clara y detallada para el cliente. Mantené el español pero usá terminología técnica de roofing. Incluí detalles como materiales, proceso de trabajo y garantía si corresponde. No inventes precios. Mantené un tono profesional pero accesible. Máximo 200 palabras.\n\n${langInstruction}`
        : `You are a professional roofing estimator in the United States. Improve and complete the following job description to sound professional, clear, and detailed for the client. Use proper roofing terminology. Include details about materials, work process, and warranty if applicable. Do not invent prices. Keep a professional but approachable tone. Maximum 200 words.\n\n${langInstruction}`

      const userPrompt = language === 'es'
        ? `Tipo de trabajo: ${jobType}\nTipo de techo: ${roofType}\nSuperficie: ${sqft} sqft\n\nDescripción original del techista:\n"${description}"\n\nMejorá esta descripción (respondé SOLO en español):`
        : `Job type: ${jobType}\nRoof type: ${roofType}\nArea: ${sqft} sqft\n\nOriginal roofer description:\n"${description}"\n\nImprove this description (respond ONLY in English):`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 700,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('[improve-description] Anthropic error:', err)
        return NextResponse.json(
          { improved: enhanceWithTemplate(description, jobType, roofType, sqft, language) },
          { status: 200 }
        )
      }

      const data = await res.json()
      const improved = data.content?.[0]?.text?.trim()

      if (improved) {
        return NextResponse.json({ improved, source: 'ai' })
      }
    }

    const improved = enhanceWithTemplate(description, jobType, roofType, sqft, language)
    return NextResponse.json({ improved, source: 'template' })

  } catch (error) {
    console.error('[improve-description] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function enhanceWithTemplate(
  description: string,
  jobType: string,
  roofType: string,
  sqft: number,
  lang: 'es' | 'en'
): string {
  const jobTypeMap: Record<string, { es: string; en: string }> = {
    repair: { es: 'Reparación de techo', en: 'Roof Repair' },
    reroof: { es: 'Retecho completo', en: 'Complete Re-roof' },
    new_roof: { es: 'Techo nuevo', en: 'New Roof Installation' },
    gutters: { es: 'Instalación de canaletas', en: 'Gutter Installation' },
    waterproofing: { es: 'Impermeabilización', en: 'Waterproofing' },
    other: { es: 'Trabajo de techo', en: 'Roofing Work' },
  }
  const roofTypeMap: Record<string, { es: string; en: string }> = {
    shingle: { es: 'tejas asfálticas', en: 'asphalt shingles' },
    tile: { es: 'tejas de cerámica', en: 'tile roofing' },
    metal: { es: 'techo de metal', en: 'metal roofing' },
    flat: { es: 'techo plano', en: 'flat roof system' },
    other: { es: 'sistema de techo', en: 'roofing system' },
  }

  const jt = jobTypeMap[jobType] || jobTypeMap.other
  const rt = roofTypeMap[roofType] || roofTypeMap.other

  if (lang === 'es') {
    return `${jt.es} — ${rt.es} (${sqft > 0 ? sqft + ' sqft' : 'superficie a confirmar'})

${description}

El trabajo incluye:
• Inspección inicial del área de trabajo
• Retiro y disposición de materiales existentes según corresponda
• Instalación de ${rt.es} de primera calidad
• Limpieza completa del sitio al finalizar
• Garantía de mano de obra incluida

Nota: Los materiales utilizados serán de marcas reconocidas (GAF, Owens Corning o equivalente). Todos los trabajos cumplen con los códigos de construcción locales.`
  }

  return `${jt.en} — ${rt.en} (${sqft > 0 ? sqft + ' sqft' : 'area to be confirmed'})

${description}

Scope of work includes:
• Initial inspection of the work area
• Removal and proper disposal of existing materials as needed
• Installation of premium quality ${rt.en}
• Complete site cleanup upon completion
• Workmanship warranty included

Note: Materials used will be from recognized brands (GAF, Owens Corning, or equivalent). All work complies with local building codes.`
}
