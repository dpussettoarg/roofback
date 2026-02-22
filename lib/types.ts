export type UserRole = 'owner' | 'ops' | 'cs'

export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  organization_id: string
  full_name: string
  address: string
  phone: string
  email: string
  notes: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  company_name: string
  phone: string
  contact_email: string
  website: string
  default_hourly_rate: number
  default_overhead_pct: number
  default_margin_pct: number
  language: 'es' | 'en'
  language_preference: 'es' | 'en'
  created_at: string
  updated_at: string
  // Organization & RBAC
  organization_id: string | null
  role: UserRole
  // Billing
  subscription_status: 'trialing' | 'active' | 'canceled' | 'past_due'
  trial_expires_at: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  price_id?: string | null
  subscription_price_id?: string | null
}

export interface Job {
  id: string
  user_id: string
  organization_id: string | null
  customer_id: string | null
  client_name: string
  client_phone: string
  client_email: string
  client_address: string
  job_type: JobType
  roof_type: RoofType
  square_footage: number
  pitch: string
  status: JobStatus
  estimated_total: number
  actual_total: number
  profit: number
  overhead_pct: number
  margin_pct: number
  notes: string
  created_at: string
  updated_at: string
  completed_at: string | null
  estimate_mode: 'simple' | 'itemized'
  simple_description: string
  public_token: string
  client_status: 'pending' | 'approved' | 'rejected'
  client_signature: string
  approved_at: string | null
  // Workflow & scheduling
  start_date: string | null
  duration_days: number
  deadline_date: string | null
  payment_terms: string
  workflow_stage: WorkflowStage
  photos: string[]
  materials_ordered: boolean
  language_output: 'es' | 'en'
  lat: number | null
  lng: number | null
  job_number: number | null
  estimate_version: number
  // Simple mode budget buckets (for financial tracker)
  simple_materials_budget: number
  simple_labor_budget: number
  simple_other_budget: number
}

export type JobType = 'repair' | 'reroof' | 'new_roof' | 'gutters' | 'waterproofing' | 'other'
export type RoofType = 'shingle' | 'tile' | 'metal' | 'flat' | 'other'
export type JobStatus = 'estimate' | 'approved' | 'in_progress' | 'completed'
export type WorkflowStage = 'draft' | 'sent' | 'approved' | 'materials_ordered' | 'in_progress' | 'completed' | 'invoiced' | 'paid'

export const PAYMENT_TERMS_OPTIONS = [
  { value: '50/50', label_es: '50% anticipo, 50% al terminar', label_en: '50% upfront, 50% upon completion' },
  { value: 'full_upfront', label_es: '100% anticipo', label_en: '100% upfront' },
  { value: 'full_completion', label_es: '100% al terminar', label_en: '100% upon completion' },
  { value: 'net30', label_es: 'Net 30 días', label_en: 'Net 30 days' },
  { value: '30/70', label_es: '30% anticipo, 70% al terminar', label_en: '30% upfront, 70% upon completion' },
]

export interface EstimateItem {
  id: string
  job_id: string
  category: 'material' | 'labor' | 'other'
  name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  sort_order: number
  created_at: string
}

export interface MaterialChecklist {
  id: string
  job_id: string
  estimate_item_id: string | null
  name: string
  quantity_needed: number
  unit: string
  is_checked: boolean
  actual_cost: number | null
  notes: string
  created_at: string
}

export interface TimeEntry {
  id: string
  job_id: string
  worker_name: string
  date: string
  start_time: string | null
  end_time: string | null
  hours: number
  hourly_rate: number
  total_cost: number
  notes: string
  created_at: string
}

export interface Expense {
  id: string
  job_id: string
  description: string
  amount: number
  date: string
  notes: string
  created_at: string
}

export interface ActivityLog {
  id: string
  job_id: string
  user_id: string
  description: string
  photos: string[]
  log_type: 'progress' | 'issue' | 'delivery' | 'completion'
  created_at: string
}

export function formatJobNumber(jobNumber: number | null | undefined): string {
  if (!jobNumber) return ''
  return `J${String(jobNumber).padStart(3, '0')}`
}

export function formatEstimateNumber(jobNumber: number | null | undefined, version: number = 1): string {
  if (!jobNumber) return ''
  return `${formatJobNumber(jobNumber)}-${String(version).padStart(2, '0')}`
}

// Simple translation map for Español → English
export const TRANSLATE_LABELS: Record<string, string> = {
  'Presupuesto': 'Estimate',
  'Materiales': 'Materials',
  'Mano de obra': 'Labor',
  'Otros': 'Other',
  'Subtotal': 'Subtotal',
  'Total': 'Total',
  'Descripción': 'Description',
  'Cantidad': 'Quantity',
  'Precio': 'Price',
  'Condiciones de pago': 'Payment Terms',
  'Fecha de inicio': 'Start Date',
  'Duración': 'Duration',
  'días': 'days',
  'Alcance del trabajo': 'Scope of Work',
  'Fotos del trabajo': 'Job Photos',
}

// Simple material name translations
export const MATERIAL_TRANSLATIONS: Record<string, string> = {
  'Tejas asfálticas': 'Asphalt Shingles',
  'Tejas arquitectónicas': 'Architectural Shingles',
  'Underlayment sintético': 'Synthetic Underlayment',
  'Underlayment 30 lb felt': '30 lb Felt Underlayment',
  'Drip edge': 'Drip Edge',
  'Flashing de aluminio': 'Aluminum Flashing',
  'Clavos para techo': 'Roofing Nails',
  'Ridge cap': 'Ridge Cap',
  'Ice & water shield': 'Ice & Water Shield',
  'Sellador de techo': 'Roof Sealant',
  'Cemento para techo': 'Roofing Cement',
  'Ventilación de cumbrera': 'Ridge Ventilation',
  'Pipe boots': 'Pipe Boots',
  'Step flashing': 'Step Flashing',
  'Plywood/OSB': 'Plywood/OSB',
  'Starter strip': 'Starter Strip',
  'Canaleta': 'Gutter',
  'Bajante': 'Downspout',
  'Membrana asfáltica': 'Asphalt Membrane',
  'Mano de obra - Techista jefe': 'Labor - Lead Roofer',
  'Mano de obra - Techista': 'Labor - Roofer',
  'Mano de obra - Ayudante': 'Labor - Helper',
  'Mano de obra': 'Labor',
  'Dump fee': 'Dump Fee',
  'Material genérico': 'Generic Material',
}

export function translateMaterialName(name: string): string {
  for (const [es, en] of Object.entries(MATERIAL_TRANSLATIONS)) {
    if (name.toLowerCase().includes(es.toLowerCase())) {
      return name.replace(new RegExp(es, 'i'), en)
    }
  }
  return name
}
