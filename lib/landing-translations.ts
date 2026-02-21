export type LandingLang = 'en' | 'es'

const t = {
  nav: {
    login: { en: 'Log In', es: 'Iniciar Sesión' },
    cta: { en: 'Start Free Trial', es: 'Prueba Gratis' },
  },
  hero: {
    headline: {
      en: 'Stop losing money on your roofing estimates.',
      es: 'Deja de perder dinero en tus estimados de techos.',
    },
    sub: {
      en: 'RoofBack is the all-in-one back-office tool that helps roofing contractors create professional estimates, get client signatures, and track every job — in minutes, not hours.',
      es: 'RoofBack es la herramienta todo-en-uno que ayuda a techistas a crear estimados profesionales, obtener firmas de clientes y hacer seguimiento de cada trabajo — en minutos, no horas.',
    },
    cta: {
      en: 'Start your 14-day free trial',
      es: 'Comienza tu prueba gratis de 14 dias',
    },
    ctaSub: {
      en: 'No credit card required',
      es: 'No requiere tarjeta de credito',
    },
  },
  slogans: [
    { en: 'The way to grow.', es: 'La manera de crecer.' },
    { en: 'Estimate smarter.', es: 'Estima mas inteligente.' },
    { en: 'Close faster.', es: 'Cierra mas rapido.' },
  ],
  steps: {
    title: { en: 'How it works', es: 'Como funciona' },
    sub: {
      en: 'Three simple steps to a signed proposal.',
      es: 'Tres pasos simples a una propuesta firmada.',
    },
    items: [
      {
        title: { en: 'Create the Job', es: 'Crear el trabajo' },
        desc: {
          en: 'Enter the client info, address, roof type and square footage. That\'s it.',
          es: 'Ingresa la info del cliente, direccion, tipo de techo y superficie. Eso es todo.',
        },
      },
      {
        title: { en: 'Generate the Estimate', es: 'Generar el estimado' },
        desc: {
          en: 'Our AI writes a professional proposal in seconds. Add line items or keep it simple.',
          es: 'Nuestra IA escribe una propuesta profesional en segundos. Agrega items o mantenelo simple.',
        },
      },
      {
        title: { en: 'Get the Signature', es: 'Obtener la firma' },
        desc: {
          en: 'Send a branded link. Your client reviews, signs, and approves — right from their phone.',
          es: 'Envia un link con tu marca. Tu cliente revisa, firma y aprueba — directo desde su celular.',
        },
      },
    ],
  },
  benefits: {
    title: { en: 'Why contractors choose RoofBack', es: 'Por que los techistas eligen RoofBack' },
    items: [
      { en: 'Save 2+ hours per estimate with AI-powered proposals', es: 'Ahorra 2+ horas por estimado con propuestas generadas por IA' },
      { en: 'Eliminate math errors and waste factor mistakes', es: 'Elimina errores de calculo y factor de desperdicio' },
      { en: 'Professional PDF exports your clients will trust', es: 'PDFs profesionales que tus clientes van a confiar' },
      { en: 'Get e-signatures without chasing clients', es: 'Obtene firmas electronicas sin perseguir clientes' },
      { en: 'Track time, materials and profit per job', es: 'Registra tiempo, materiales y ganancia por trabajo' },
      { en: 'Works on your phone — take it to every job site', es: 'Funciona en tu celular — llevalo a cada obra' },
    ],
  },
  pricing: {
    title: { en: 'Simple, transparent pricing', es: 'Precios simples y transparentes' },
    sub: {
      en: 'One plan. Everything included. No hidden fees.',
      es: 'Un plan. Todo incluido. Sin costos ocultos.',
    },
    plan: 'RoofBack Pro',
    monthly: { en: '/month', es: '/mes' },
    yearly: { en: '/year', es: '/ano' },
    trial: { en: '14 days free. No credit card required.', es: '14 dias gratis. No requiere tarjeta.' },
    cta: { en: 'Start Free Trial', es: 'Comenzar Prueba Gratis' },
    features: [
      { en: 'Unlimited jobs & estimates', es: 'Trabajos y estimados ilimitados' },
      { en: 'AI-powered proposals (EN/ES)', es: 'Propuestas con IA (EN/ES)' },
      { en: 'Professional PDF exports', es: 'Exportacion de PDF profesional' },
      { en: 'Client e-signature portal', es: 'Portal de firma electronica' },
      { en: 'Time tracking & job costing', es: 'Registro de horas y costos' },
      { en: 'Material checklist generator', es: 'Generador de checklist de materiales' },
      { en: 'Bilingual support (EN/ES)', es: 'Soporte bilingue (EN/ES)' },
    ],
    toggle: {
      monthly: { en: 'Monthly', es: 'Mensual' },
      yearly: { en: 'Yearly', es: 'Anual' },
      save: { en: 'Save 17%', es: 'Ahorra 17%' },
    },
  },
  footer: {
    tagline: {
      en: 'The back-office tool built for roofing contractors.',
      es: 'La herramienta de back-office para techistas.',
    },
    copy: '2026 RoofBack. All rights reserved.',
  },
} as const

export function lt(
  key: Record<string, string>,
  lang: LandingLang,
): string {
  return key[lang] || key['en'] || ''
}

export default t
