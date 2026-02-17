import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

interface RequestBody {
  description: string
  jobType: string
  roofType: string
  squareFootage: number
  language: 'es' | 'en'
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody
    const { description, jobType, roofType, squareFootage, language } = body

    if (!description || description.trim().length < 5) {
      return NextResponse.json(
        { error: language === 'es' ? 'Escribí al menos una descripción breve' : 'Write at least a brief description first' },
        { status: 400 }
      )
    }

    // If OpenAI key is available, use it
    if (OPENAI_API_KEY) {
      const systemPrompt = language === 'es'
        ? `Sos un presupuestista profesional de techos en Estados Unidos. Mejorá y completá la siguiente descripción de trabajo para que suene profesional, clara y detallada para el cliente. Mantené el español pero usá terminología técnica de roofing. Incluí detalles como materiales, proceso de trabajo y garantía si corresponde. No inventes precios. Mantené un tono profesional pero accesible. Máximo 200 palabras.`
        : `You are a professional roofing estimator in the United States. Improve and complete the following job description to sound professional, clear, and detailed for the client. Use proper roofing terminology. Include details about materials, work process, and warranty if applicable. Do not invent prices. Keep a professional but approachable tone. Maximum 200 words.`

      const userPrompt = language === 'es'
        ? `Tipo de trabajo: ${jobType}\nTipo de techo: ${roofType}\nSuperficie: ${squareFootage} sqft\n\nDescripción original del techista:\n"${description}"\n\nMejorá esta descripción:`
        : `Job type: ${jobType}\nRoof type: ${roofType}\nArea: ${squareFootage} sqft\n\nOriginal roofer description:\n"${description}"\n\nImprove this description:`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        console.error('OpenAI error:', err)
        return NextResponse.json(
          { improved: enhanceWithTemplate(description, jobType, roofType, squareFootage, language) },
          { status: 200 }
        )
      }

      const data = await res.json()
      const improved = data.choices?.[0]?.message?.content?.trim()

      if (improved) {
        return NextResponse.json({ improved, source: 'ai' })
      }
    }

    // Fallback: template-based enhancement
    const improved = enhanceWithTemplate(description, jobType, roofType, squareFootage, language)
    return NextResponse.json({ improved, source: 'template' })

  } catch (error) {
    console.error('AI improve error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
