-- ============================================
-- RoofBack - Schema completo para Supabase
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de perfiles (se crea automáticamente al registrarse)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text default '',
  company_name text default '',
  phone text default '',
  default_hourly_rate numeric(10,2) default 35.00,
  default_overhead_pct numeric(5,2) default 15.00,
  default_margin_pct numeric(5,2) default 20.00,
  language text default 'es',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de trabajos
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_name text not null,
  client_phone text default '',
  client_email text default '',
  client_address text default '',
  job_type text not null default 'repair',
  roof_type text default 'shingle',
  square_footage numeric(10,2) default 0,
  pitch text default '4/12',
  status text default 'estimate',
  estimated_total numeric(12,2) default 0,
  actual_total numeric(12,2) default 0,
  profit numeric(12,2) default 0,
  overhead_pct numeric(5,2) default 15.00,
  margin_pct numeric(5,2) default 20.00,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

-- Items del presupuesto
create table public.estimate_items (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  category text not null default 'material',
  name text not null,
  description text default '',
  quantity numeric(10,2) default 1,
  unit text default 'each',
  unit_price numeric(10,2) default 0,
  total_price numeric(12,2) default 0,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Checklist de materiales
create table public.material_checklist (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  estimate_item_id uuid references public.estimate_items(id) on delete set null,
  name text not null,
  quantity_needed numeric(10,2) default 1,
  unit text default 'each',
  is_checked boolean default false,
  actual_cost numeric(10,2),
  notes text default '',
  created_at timestamptz default now()
);

-- Registro de horas
create table public.time_entries (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  worker_name text not null,
  date date not null default current_date,
  start_time time,
  end_time time,
  hours numeric(5,2) default 0,
  hourly_rate numeric(10,2) default 0,
  total_cost numeric(10,2) default 0,
  notes text default '',
  created_at timestamptz default now()
);

-- Gastos extras
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) on delete cascade not null,
  description text not null,
  amount numeric(10,2) not null default 0,
  date date not null default current_date,
  notes text default '',
  created_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.estimate_items enable row level security;
alter table public.material_checklist enable row level security;
alter table public.time_entries enable row level security;
alter table public.expenses enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Jobs
create policy "Users can view own jobs" on public.jobs for select using (auth.uid() = user_id);
create policy "Users can create own jobs" on public.jobs for insert with check (auth.uid() = user_id);
create policy "Users can update own jobs" on public.jobs for update using (auth.uid() = user_id);
create policy "Users can delete own jobs" on public.jobs for delete using (auth.uid() = user_id);

-- Estimate items (via job ownership)
create policy "Users can view own estimate items" on public.estimate_items
  for select using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can create own estimate items" on public.estimate_items
  for insert with check (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can update own estimate items" on public.estimate_items
  for update using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can delete own estimate items" on public.estimate_items
  for delete using (job_id in (select id from public.jobs where user_id = auth.uid()));

-- Material checklist
create policy "Users can view own checklist" on public.material_checklist
  for select using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can create own checklist" on public.material_checklist
  for insert with check (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can update own checklist" on public.material_checklist
  for update using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can delete own checklist" on public.material_checklist
  for delete using (job_id in (select id from public.jobs where user_id = auth.uid()));

-- Time entries
create policy "Users can view own time entries" on public.time_entries
  for select using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can create own time entries" on public.time_entries
  for insert with check (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can update own time entries" on public.time_entries
  for update using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can delete own time entries" on public.time_entries
  for delete using (job_id in (select id from public.jobs where user_id = auth.uid()));

-- Expenses
create policy "Users can view own expenses" on public.expenses
  for select using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can create own expenses" on public.expenses
  for insert with check (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can update own expenses" on public.expenses
  for update using (job_id in (select id from public.jobs where user_id = auth.uid()));
create policy "Users can delete own expenses" on public.expenses
  for delete using (job_id in (select id from public.jobs where user_id = auth.uid()));

-- ============================================
-- Trigger: crear perfil automáticamente al registrarse
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
