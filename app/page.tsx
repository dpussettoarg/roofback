/**
 * Landing page — SERVER component.
 * Exports static metadata (title, description, canonical, OG) for crawlers.
 * Injects JSON-LD SoftwareApplication schema.
 * The interactive UI (lang toggle, Supabase session check) lives in LandingClient.
 */
import type { Metadata } from 'next'
import { LandingClient } from '@/components/landing/landing-client'

const SITE_URL = 'https://roofback.app'

export const metadata: Metadata = {
  title: 'RoofBack | Gestión de Roofing por Techistas con 20 años de Experiencia',
  description:
    'Optimizá tus presupuestos, controlá gastos y organizá tu equipo con la herramienta diseñada en el techo. Basada en 20 años de experiencia en USA y Latam. Gratis 14 días.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'RoofBack | Software de Roofing — Control total en un celular',
    description:
      'Presupuestos con IA, cronograma visual, control de gastos en tiempo real y AI Advisor. Hecho por techistas, para techistas.',
    url: SITE_URL,
    images: [
      {
        url: '/og?title=Control%20total%20de%20tu%20negocio%20de%20techado&sub=Presupuestos%20con%20IA%2C%20cronograma%20visual%20y%20control%20de%20gastos%20en%20tiempo%20real.',
        width: 1200,
        height: 630,
        alt: 'RoofBack Owner Dashboard — control de gastos y AI Advisor',
      },
    ],
  },
}

// JSON-LD SoftwareApplication schema for Google & AI crawlers (Perplexity, ChatGPT)
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'RoofBack',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android, iOS',
  description:
    'RoofBack es una herramienta de gestión de negocios de roofing (techado) diseñada por techistas con 20 años de experiencia en USA y Latinoamérica. Incluye presupuestos con IA, firma digital, control de gastos, cronograma visual de obra y AI Business Advisor.',
  inLanguage: ['es', 'en'],
  offers: {
    '@type': 'Offer',
    price: '29',
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: '29',
      priceCurrency: 'USD',
      billingDuration: 'P1M',
    },
    description: 'Free 14-day trial, no credit card required.',
    availability: 'https://schema.org/OnlineOnly',
  },
  featureList: [
    'AI-powered roofing estimates in seconds',
    'Client digital signature portal',
    'Real-time budget vs actual cost tracker',
    '4-milestone visual job timeline',
    'AI Business Advisor with daily briefing',
    'Team management with role-based access',
    'Bilingual support (English / Spanish)',
  ],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '47',
  },
  author: {
    '@type': 'Organization',
    name: 'RoofBack',
    url: SITE_URL,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@roofback.app',
      contactType: 'customer support',
    },
  },
}

// FAQ schema — helps appear in "People Also Ask" on Google
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué es RoofBack?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'RoofBack es un software de gestión para techistas que incluye presupuestos con IA, firma digital del cliente, control de gastos en tiempo real, cronograma de obra y un AI Business Advisor. Desarrollado por techistas con 20 años de experiencia en USA y Latinoamérica.',
      },
    },
    {
      '@type': 'Question',
      name: 'How much does RoofBack cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'RoofBack costs $29/month after a free 14-day trial. No credit card required to start. The plan includes unlimited jobs, AI proposals, e-signatures, team management, and the AI Business Advisor.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Es RoofBack fácil de usar para techistas que no usan tecnología?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sí. RoofBack fue diseñado específicamente para techistas, no para administradores. Se puede usar desde el celular en la obra, sin entrenamiento previo. La configuración tarda menos de 5 minutos.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does RoofBack work for roofing companies in the US?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. RoofBack is built specifically for the US roofing market, with English and Spanish support, USD pricing, standard US roof type templates (3-Tab Asphalt, Architectural, Standing Seam Metal, Stone-Coated Steel), and US-compliant digital contracts.',
      },
    },
  ],
}

export default function HomePage() {
  return (
    <>
      {/* Inject structured data for Google and AI crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/*
        Static SEO-friendly content for crawlers.
        This renders server-side so Googlebot sees real text, not a blank JS shell.
        Visually hidden — the interactive LandingClient below renders the actual UI.
      */}
      <div className="sr-only" aria-hidden="true">
        <h1>RoofBack — Software de Roofing por Techistas con 20 años de Experiencia</h1>
        <h2>Hecho por techistas, para techistas</h2>
        <p>
          Optimizá tus presupuestos, controlá gastos y organizá tu equipo con la herramienta
          diseñada en el techo. Basada en 20 años de experiencia en USA y Latam.
        </p>
        <h2>Presupuestos con IA en segundos</h2>
        <p>
          Generá propuestas profesionales en inglés o español. El cliente firma digitalmente desde
          el celular. Tus presupuestos quedan inmutables como contrato legal.
        </p>
        <h2>Control de Gastos en Tiempo Real</h2>
        <p>
          Materiales, mano de obra y gastos varios contra lo presupuestado — en una pantalla.
          El semáforo de Ganancia vs. Real te dice dónde se va el dinero.
        </p>
        <h2>AI Business Advisor</h2>
        <p>
          Tres consejos accionables cada mañana. Análisis de burn rate, riesgos de sobrecosto
          y oportunidades generados por Claude IA con tus datos reales.
        </p>
        <h2>Cronograma Visual de 4 Hitos</h2>
        <p>
          Contrato → Materiales → Obra → Finalizado. Notificá al cliente de cada avance por SMS
          o WhatsApp desde la misma pantalla.
        </p>
        <h2>RoofBack vs Software Corporativo vs Hojas de Cálculo</h2>
        <table>
          <thead>
            <tr>
              <th>Área</th>
              <th>Software Corporativo</th>
              <th>Hojas de Cálculo</th>
              <th>RoofBack</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Setup</td>
              <td>Meses de entrenamiento</td>
              <td>Caos constante</td>
              <td>Listo en 5 minutos</td>
            </tr>
            <tr>
              <td>Insights</td>
              <td>Gráficos lindos pero vacíos</td>
              <td>Ninguno</td>
              <td>AI Advisor con consejos accionables</td>
            </tr>
            <tr>
              <td>Equipo</td>
              <td>Licencias caras por usuario</td>
              <td>Gritos por teléfono</td>
              <td>Organización centralizada</td>
            </tr>
            <tr>
              <td>Presupuestos</td>
              <td>Formularios interminables</td>
              <td>Cálculos manuales</td>
              <td>IA en segundos + firma digital</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Interactive client-side landing page */}
      <LandingClient />
    </>
  )
}
