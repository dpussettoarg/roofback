import type { JobType } from './types'

export interface MaterialTemplate {
  name: string
  unit: string
  unit_price: number
  category: 'material' | 'labor' | 'other'
  per_sqft?: number // cantidad por pie cuadrado (para calcular auto)
}

// Materiales base con precios promedio USA 2025-2026
export const DEFAULT_MATERIALS: Record<string, MaterialTemplate> = {
  shingles_3tab: { name: 'Tejas asfálticas 3-tab (bundle)', unit: 'bundle', unit_price: 32, category: 'material', per_sqft: 0.033 },
  shingles_arch: { name: 'Tejas arquitectónicas (bundle)', unit: 'bundle', unit_price: 42, category: 'material', per_sqft: 0.033 },
  underlayment_syn: { name: 'Underlayment sintético (rollo)', unit: 'rollo', unit_price: 65, category: 'material', per_sqft: 0.005 },
  underlayment_felt: { name: 'Underlayment 30 lb felt (rollo)', unit: 'rollo', unit_price: 22, category: 'material', per_sqft: 0.005 },
  drip_edge: { name: 'Drip edge 10ft', unit: 'pieza', unit_price: 8, category: 'material', per_sqft: 0.015 },
  flashing_alum: { name: 'Flashing de aluminio (rollo)', unit: 'rollo', unit_price: 15, category: 'material' },
  nails_125: { name: 'Clavos para techo 1¼" (lb)', unit: 'lb', unit_price: 4.5, category: 'material', per_sqft: 0.02 },
  nails_175: { name: 'Clavos para techo 1¾" (lb)', unit: 'lb', unit_price: 5, category: 'material' },
  ridge_cap: { name: 'Ridge cap (bundle)', unit: 'bundle', unit_price: 55, category: 'material' },
  ice_water: { name: 'Ice & water shield (rollo)', unit: 'rollo', unit_price: 95, category: 'material' },
  sealant: { name: 'Sellador de techo (tubo)', unit: 'tubo', unit_price: 8, category: 'material' },
  cement: { name: 'Cemento para techo (galón)', unit: 'galón', unit_price: 18, category: 'material' },
  ridge_vent: { name: 'Ventilación de cumbrera 4ft', unit: 'pieza', unit_price: 16, category: 'material' },
  pipe_boot: { name: 'Pipe boots', unit: 'pieza', unit_price: 12, category: 'material' },
  step_flash: { name: 'Step flashing (pieza)', unit: 'pieza', unit_price: 3, category: 'material' },
  plywood: { name: 'Plywood/OSB 4x8 (hoja)', unit: 'hoja', unit_price: 35, category: 'material' },
  starter: { name: 'Starter strip (bundle)', unit: 'bundle', unit_price: 22, category: 'material' },
  gutter: { name: 'Canaleta 10ft sección', unit: 'pieza', unit_price: 12, category: 'material' },
  downspout: { name: 'Bajante 10ft', unit: 'pieza', unit_price: 10, category: 'material' },
  gutter_seal: { name: 'Sellador de canaletas (tubo)', unit: 'tubo', unit_price: 6, category: 'material' },
}

interface TemplateItem {
  materialKey?: string
  name: string
  category: 'material' | 'labor' | 'other'
  quantity: number
  unit: string
  unit_price: number
  auto_scale?: boolean // escalar por sqft
}

// Templates por tipo de trabajo - cantidades base para ~1000 sqft
export const JOB_TEMPLATES: Record<JobType, { label_es: string; label_en: string; items: TemplateItem[] }> = {
  repair: {
    label_es: 'Reparación',
    label_en: 'Repair',
    items: [
      { materialKey: 'shingles_arch', name: 'Tejas arquitectónicas (bundle)', category: 'material', quantity: 3, unit: 'bundle', unit_price: 42 },
      { materialKey: 'underlayment_felt', name: 'Underlayment 30 lb felt (rollo)', category: 'material', quantity: 1, unit: 'rollo', unit_price: 22 },
      { materialKey: 'nails_125', name: 'Clavos para techo 1¼" (lb)', category: 'material', quantity: 2, unit: 'lb', unit_price: 4.5 },
      { materialKey: 'sealant', name: 'Sellador de techo (tubo)', category: 'material', quantity: 2, unit: 'tubo', unit_price: 8 },
      { materialKey: 'flashing_alum', name: 'Flashing de aluminio (rollo)', category: 'material', quantity: 1, unit: 'rollo', unit_price: 15 },
      { name: 'Mano de obra - Techista', category: 'labor', quantity: 4, unit: 'horas', unit_price: 35 },
      { name: 'Mano de obra - Ayudante', category: 'labor', quantity: 4, unit: 'horas', unit_price: 25 },
    ],
  },
  reroof: {
    label_es: 'Retecho completo',
    label_en: 'Full Reroof',
    items: [
      { name: 'Tejas arquitectónicas (bundle)', category: 'material', quantity: 33, unit: 'bundle', unit_price: 42, auto_scale: true },
      { name: 'Underlayment sintético (rollo)', category: 'material', quantity: 5, unit: 'rollo', unit_price: 65, auto_scale: true },
      { name: 'Drip edge 10ft', category: 'material', quantity: 15, unit: 'pieza', unit_price: 8 },
      { name: 'Ridge cap (bundle)', category: 'material', quantity: 3, unit: 'bundle', unit_price: 55 },
      { name: 'Ice & water shield (rollo)', category: 'material', quantity: 2, unit: 'rollo', unit_price: 95 },
      { name: 'Starter strip (bundle)', category: 'material', quantity: 4, unit: 'bundle', unit_price: 22 },
      { name: 'Clavos para techo 1¼" (lb)', category: 'material', quantity: 20, unit: 'lb', unit_price: 4.5, auto_scale: true },
      { name: 'Ventilación de cumbrera 4ft', category: 'material', quantity: 6, unit: 'pieza', unit_price: 16 },
      { name: 'Pipe boots', category: 'material', quantity: 3, unit: 'pieza', unit_price: 12 },
      { name: 'Step flashing (pieza)', category: 'material', quantity: 12, unit: 'pieza', unit_price: 3 },
      { name: 'Sellador de techo (tubo)', category: 'material', quantity: 4, unit: 'tubo', unit_price: 8 },
      { name: 'Dump fee (basura)', category: 'other', quantity: 1, unit: 'viaje', unit_price: 350 },
      { name: 'Mano de obra - Techista jefe', category: 'labor', quantity: 16, unit: 'horas', unit_price: 45 },
      { name: 'Mano de obra - Techista', category: 'labor', quantity: 32, unit: 'horas', unit_price: 35 },
      { name: 'Mano de obra - Ayudante', category: 'labor', quantity: 32, unit: 'horas', unit_price: 25 },
    ],
  },
  new_roof: {
    label_es: 'Techo nuevo',
    label_en: 'New Roof',
    items: [
      { name: 'Plywood/OSB 4x8 (hoja)', category: 'material', quantity: 32, unit: 'hoja', unit_price: 35, auto_scale: true },
      { name: 'Tejas arquitectónicas (bundle)', category: 'material', quantity: 33, unit: 'bundle', unit_price: 42, auto_scale: true },
      { name: 'Underlayment sintético (rollo)', category: 'material', quantity: 5, unit: 'rollo', unit_price: 65, auto_scale: true },
      { name: 'Drip edge 10ft', category: 'material', quantity: 15, unit: 'pieza', unit_price: 8 },
      { name: 'Ridge cap (bundle)', category: 'material', quantity: 3, unit: 'bundle', unit_price: 55 },
      { name: 'Ice & water shield (rollo)', category: 'material', quantity: 2, unit: 'rollo', unit_price: 95 },
      { name: 'Starter strip (bundle)', category: 'material', quantity: 4, unit: 'bundle', unit_price: 22 },
      { name: 'Clavos para techo 1¼" (lb)', category: 'material', quantity: 25, unit: 'lb', unit_price: 4.5, auto_scale: true },
      { name: 'Clavos para techo 1¾" (lb)', category: 'material', quantity: 15, unit: 'lb', unit_price: 5, auto_scale: true },
      { name: 'Ventilación de cumbrera 4ft', category: 'material', quantity: 6, unit: 'pieza', unit_price: 16 },
      { name: 'Pipe boots', category: 'material', quantity: 3, unit: 'pieza', unit_price: 12 },
      { name: 'Flashing de aluminio (rollo)', category: 'material', quantity: 2, unit: 'rollo', unit_price: 15 },
      { name: 'Sellador de techo (tubo)', category: 'material', quantity: 6, unit: 'tubo', unit_price: 8 },
      { name: 'Mano de obra - Techista jefe', category: 'labor', quantity: 24, unit: 'horas', unit_price: 45 },
      { name: 'Mano de obra - Techista', category: 'labor', quantity: 48, unit: 'horas', unit_price: 35 },
      { name: 'Mano de obra - Ayudante', category: 'labor', quantity: 48, unit: 'horas', unit_price: 25 },
    ],
  },
  gutters: {
    label_es: 'Canaletas',
    label_en: 'Gutters',
    items: [
      { name: 'Canaleta 10ft sección', category: 'material', quantity: 12, unit: 'pieza', unit_price: 12 },
      { name: 'Bajante 10ft', category: 'material', quantity: 4, unit: 'pieza', unit_price: 10 },
      { name: 'Codos para bajante', category: 'material', quantity: 8, unit: 'pieza', unit_price: 5 },
      { name: 'Tapas de canaleta', category: 'material', quantity: 4, unit: 'pieza', unit_price: 3 },
      { name: 'Ganchos/soportes', category: 'material', quantity: 24, unit: 'pieza', unit_price: 2 },
      { name: 'Sellador de canaletas (tubo)', category: 'material', quantity: 3, unit: 'tubo', unit_price: 6 },
      { name: 'Tornillos para canaleta (caja)', category: 'material', quantity: 1, unit: 'caja', unit_price: 12 },
      { name: 'Mano de obra - Techista', category: 'labor', quantity: 8, unit: 'horas', unit_price: 35 },
      { name: 'Mano de obra - Ayudante', category: 'labor', quantity: 8, unit: 'horas', unit_price: 25 },
    ],
  },
  waterproofing: {
    label_es: 'Impermeabilización',
    label_en: 'Waterproofing',
    items: [
      { name: 'Membrana asfáltica (rollo)', category: 'material', quantity: 10, unit: 'rollo', unit_price: 45, auto_scale: true },
      { name: 'Primer/imprimante (galón)', category: 'material', quantity: 5, unit: 'galón', unit_price: 25, auto_scale: true },
      { name: 'Cemento para techo (galón)', category: 'material', quantity: 3, unit: 'galón', unit_price: 18 },
      { name: 'Cinta para juntas (rollo)', category: 'material', quantity: 4, unit: 'rollo', unit_price: 8 },
      { name: 'Sellador de techo (tubo)', category: 'material', quantity: 6, unit: 'tubo', unit_price: 8 },
      { name: 'Mano de obra - Techista', category: 'labor', quantity: 16, unit: 'horas', unit_price: 35 },
      { name: 'Mano de obra - Ayudante', category: 'labor', quantity: 16, unit: 'horas', unit_price: 25 },
    ],
  },
  other: {
    label_es: 'Otro',
    label_en: 'Other',
    items: [
      { name: 'Material genérico', category: 'material', quantity: 1, unit: 'each', unit_price: 0 },
      { name: 'Mano de obra', category: 'labor', quantity: 8, unit: 'horas', unit_price: 35 },
    ],
  },
}

// Escalar cantidades según pies cuadrados (base = 1000 sqft)
export function scaleTemplateItems(items: TemplateItem[], sqft: number): TemplateItem[] {
  const factor = sqft / 1000
  return items.map(item => ({
    ...item,
    quantity: item.auto_scale ? Math.ceil(item.quantity * factor) : item.quantity,
  }))
}

export const JOB_TYPE_OPTIONS = [
  { value: 'repair', label_es: 'Reparación', label_en: 'Repair' },
  { value: 'reroof', label_es: 'Retecho completo', label_en: 'Full Reroof' },
  { value: 'new_roof', label_es: 'Techo nuevo', label_en: 'New Roof' },
  { value: 'gutters', label_es: 'Canaletas', label_en: 'Gutters' },
  { value: 'waterproofing', label_es: 'Impermeabilización', label_en: 'Waterproofing' },
  { value: 'other', label_es: 'Otro', label_en: 'Other' },
]

export const ROOF_TYPE_OPTIONS = [
  { value: 'shingle', label_es: 'Tejas asfálticas', label_en: 'Asphalt Shingles' },
  { value: 'tile', label_es: 'Tejas de barro/concreto', label_en: 'Tile' },
  { value: 'metal', label_es: 'Metal', label_en: 'Metal' },
  { value: 'flat', label_es: 'Plano/Membrana', label_en: 'Flat/Membrane' },
  { value: 'other', label_es: 'Otro', label_en: 'Other' },
]

export const PITCH_OPTIONS = [
  '2/12', '3/12', '4/12', '5/12', '6/12', '7/12', '8/12', '9/12', '10/12', '12/12',
]

export const STATUS_CONFIG: Record<string, { label_es: string; label_en: string; color: string }> = {
  estimate: { label_es: 'Presupuesto', label_en: 'Estimate', color: 'bg-blue-100 text-blue-800' },
  approved: { label_es: 'Aceptado', label_en: 'Approved', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label_es: 'En progreso', label_en: 'In Progress', color: 'bg-orange-100 text-orange-800' },
  completed: { label_es: 'Terminado', label_en: 'Completed', color: 'bg-green-100 text-green-800' },
}
