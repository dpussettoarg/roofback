import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

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

interface EstimateItemInput {
  category: string
  name: string
  qty: number
  unit: string
  price: number
}

interface RequestBody {
  description: string
  jobType: string
  roofType: string
  squareFootage: number
  language: 'es' | 'en'
  clientName?: string
  clientAddress?: string
  jobNotes?: string
  estimateItems?: EstimateItemInput[]
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Server configuration error. Supabase credentials must be set.' },
        { status: 500 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // New context fields
    const clientName = body.clientName ? sanitizeForPrompt(body.clientName, 200) : ''
    const clientAddress = body.clientAddress ? sanitizeForPrompt(body.clientAddress, 200) : ''
    const jobNotes = body.jobNotes ? sanitizeForPrompt(body.jobNotes, 500) : ''
    const estimateItems = Array.isArray(body.estimateItems)
      ? body.estimateItems.slice(0, 20).map((item) => ({
          category: sanitizeForPrompt(String(item.category || ''), 50),
          name: sanitizeForPrompt(String(item.name || ''), 100),
          qty: Number(item.qty) || 0,
          unit: sanitizeForPrompt(String(item.unit || ''), 30),
          price: Number(item.price) || 0,
        }))
      : []

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
        ? `Sos un presupuestista profesional de techados en Estados Unidos. Usando los detalles del trabajo provistos, escribí una carta de propuesta clara y específica dirigida al cliente. Usá su nombre y dirección. Mencioná los materiales e ítems de trabajo específicos listados. NO inventes precios. Estructura: 1) Intro breve dirigida al cliente, 2) Alcance del trabajo (usá bullets referenciando materiales/ítems reales), 3) Qué incluye, 4) Próximos pasos. Máximo 250 palabras. Tono: profesional pero directo.\n\n${langInstruction}`
        : `You are a professional roofing estimator in the United States. Using the job details provided, write a clear, specific proposal letter addressed to the client. Use their name and address. Reference the specific materials and work items listed. Do NOT invent prices. Structure: 1) Brief intro addressing the client, 2) Scope of work (use bullet points referencing actual materials/items), 3) What's included, 4) Next steps. Max 250 words. Tone: professional but direct.\n\n${langInstruction}`

      // Build items list for prompt
      const itemsText = estimateItems.length > 0
        ? estimateItems
            .map((it) => `  • ${it.name} (${it.qty} ${it.unit})`)
            .join('\n')
        : ''

      const userPrompt = language === 'es'
        ? [
            clientName ? `Cliente: ${clientName}` : '',
            clientAddress ? `Dirección: ${clientAddress}` : '',
            `Trabajo: ${jobType} / ${roofType} / ${sqft} sqft`,
            `Notas del techista: "${description}"`,
            jobNotes ? `Contexto adicional: ${jobNotes}` : '',
            itemsText ? `Ítems del presupuesto ya cargados:\n${itemsText}` : '',
            '\nEscribí la propuesta (SOLO en español):',
          ].filter(Boolean).join('\n')
        : [
            clientName ? `Client: ${clientName}` : '',
            clientAddress ? `Address: ${clientAddress}` : '',
            `Job: ${jobType} / ${roofType} / ${sqft} sqft`,
            `Roofer's notes: "${description}"`,
            jobNotes ? `Additional context: ${jobNotes}` : '',
            itemsText ? `Estimate items already added:\n${itemsText}` : '',
            '\nWrite the proposal (ONLY in English):',
          ].filter(Boolean).join('\n')

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
        logger.error('[improve-description] Anthropic error:', err)
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
    logger.error('[improve-description] Error:', error)
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
