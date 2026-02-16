export interface Profile {
  id: string
  email: string
  full_name: string
  company_name: string
  phone: string
  default_hourly_rate: number
  default_overhead_pct: number
  default_margin_pct: number
  language: 'es' | 'en'
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  user_id: string
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
}

export type JobType = 'repair' | 'reroof' | 'new_roof' | 'gutters' | 'waterproofing' | 'other'
export type RoofType = 'shingle' | 'tile' | 'metal' | 'flat' | 'other'
export type JobStatus = 'estimate' | 'approved' | 'in_progress' | 'completed'

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
