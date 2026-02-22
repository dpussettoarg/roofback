-- ============================================================
-- RoofBack — System Job Templates (4 common US roof types)
-- Run in: Supabase Dashboard → SQL Editor
-- Idempotent — safe to run multiple times.
-- ============================================================

BEGIN;

-- ── 1. TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  name_es          TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  description_es   TEXT NOT NULL DEFAULT '',
  category         TEXT NOT NULL DEFAULT 'roofing',
  default_materials JSONB NOT NULL DEFAULT '[]',
  is_system        BOOLEAN NOT NULL DEFAULT true,   -- system vs user-created
  is_sponsored     BOOLEAN NOT NULL DEFAULT false,  -- GAF / brand sponsor phase
  brand_logo       TEXT,                            -- URL for sponsor logo
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read system templates (no auth required for proposal page)
DROP POLICY IF EXISTS "Anyone reads system templates" ON public.job_templates;
CREATE POLICY "Anyone reads system templates"
  ON public.job_templates FOR SELECT
  USING (is_system = true);

-- Only service-role can insert/update/delete (templates are managed via migration)
-- Authenticated users cannot write system templates.

CREATE INDEX IF NOT EXISTS idx_job_templates_system ON public.job_templates(is_system, sort_order);

-- ── 2. UPSERT THE 4 SYSTEM TEMPLATES ─────────────────────────
--    ON CONFLICT DO UPDATE keeps data fresh on re-run.

INSERT INTO public.job_templates
  (id, name, name_es, description, description_es, category, is_system, sort_order, default_materials)
VALUES

-- ── Template 1: 3-Tab Asphalt Shingles ───────────────────────
(
  '00000000-0000-0000-0001-000000000001',
  '3-Tab Asphalt Shingles',
  'Tejas Asfálticas 3-Tab',
  'Standard economical entry-level roofing. Reliable weather protection with a traditional flat look. Wind resistance up to 60–70 mph. Typical lifespan 15–20 years. The budget-conscious choice for residential re-roofs.',
  'Techo asfáltico de entrada estándar. Protección confiable contra la intemperie con un aspecto plano tradicional. Resistencia al viento de hasta 60–70 mph. Vida útil típica de 15–20 años. La opción económica para re-techos residenciales.',
  'roofing',
  true,
  1,
  '[
    {"name":"3-Tab Asphalt Shingles (bundle)","name_es":"Tejas asfálticas 3-Tab (bundle)","category":"material","quantity":33,"unit":"bundle","unit_price":32,"per_sq":3.0,"checklist_qty":33,"checklist_unit":"bundle","note":"~3 bundles per square (100 sqft)"},
    {"name":"Synthetic Underlayment (roll)","name_es":"Underlayment sintético (rollo)","category":"material","quantity":5,"unit":"roll","unit_price":65,"checklist_qty":5,"checklist_unit":"roll","note":"Covers ~1,000 sqft / roll"},
    {"name":"Ice & Water Shield (roll)","name_es":"Membrana Ice & Water Shield (rollo)","category":"material","quantity":2,"unit":"roll","unit_price":95,"checklist_qty":2,"checklist_unit":"roll","note":"Eaves + valleys"},
    {"name":"Drip Edge 10ft","name_es":"Goterón 10ft","category":"material","quantity":20,"unit":"pc","unit_price":8,"checklist_qty":20,"checklist_unit":"pc","note":"Perimeter linear feet ÷ 10"},
    {"name":"Starter Strip (bundle)","name_es":"Starter strip (bundle)","category":"material","quantity":3,"unit":"bundle","unit_price":22,"checklist_qty":3,"checklist_unit":"bundle"},
    {"name":"Ridge Cap Shingles (bundle)","name_es":"Tejas de cumbrera (bundle)","category":"material","quantity":2,"unit":"bundle","unit_price":55,"checklist_qty":2,"checklist_unit":"bundle"},
    {"name":"Ridge Vent 4ft section","name_es":"Ventilación de cumbrera 4ft","category":"material","quantity":6,"unit":"pc","unit_price":16,"checklist_qty":6,"checklist_unit":"pc"},
    {"name":"Roofing Nails 1¼\" (lb)","name_es":"Clavos para techo 1¼\" (lb)","category":"material","quantity":20,"unit":"lb","unit_price":4.5,"checklist_qty":20,"checklist_unit":"lb"},
    {"name":"Roof Sealant (tube)","name_es":"Sellador de techo (tubo)","category":"material","quantity":4,"unit":"tube","unit_price":8,"checklist_qty":4,"checklist_unit":"tube"},
    {"name":"Labor – Lead Roofer","name_es":"Mano de obra – Techista principal","category":"labor","quantity":16,"unit":"hrs","unit_price":45},
    {"name":"Labor – Helper","name_es":"Mano de obra – Ayudante","category":"labor","quantity":16,"unit":"hrs","unit_price":28},
    {"name":"Dumpster / Debris removal","name_es":"Contenedor / Retiro de escombros","category":"other","quantity":1,"unit":"job","unit_price":350}
  ]'::jsonb
),

-- ── Template 2: Architectural / Dimensional Shingles ─────────
(
  '00000000-0000-0000-0002-000000000002',
  'Architectural Dimensional Shingles',
  'Tejas Arquitectónicas Dimensionales',
  'The most popular choice in the US market. Multi-layered laminated construction delivers a high-definition wood-shake look, superior wind resistance (up to 130 mph), and a 30-year manufacturer warranty. Best value for residential full replacements.',
  'La opción más popular en el mercado estadounidense. Construcción laminada multi-capa que ofrece un aspecto de alta definición, resistencia superior al viento (hasta 130 mph) y garantía de fabricante de 30 años. El mejor valor para reemplazos residenciales completos.',
  'roofing',
  true,
  2,
  '[
    {"name":"Architectural Shingles (bundle)","name_es":"Tejas arquitectónicas (bundle)","category":"material","quantity":33,"unit":"bundle","unit_price":42,"per_sq":3.0,"checklist_qty":33,"checklist_unit":"bundle","note":"~3 bundles per square (100 sqft)"},
    {"name":"Synthetic Underlayment (roll)","name_es":"Underlayment sintético (rollo)","category":"material","quantity":5,"unit":"roll","unit_price":65,"checklist_qty":5,"checklist_unit":"roll"},
    {"name":"Ice & Water Shield (roll)","name_es":"Membrana Ice & Water Shield (rollo)","category":"material","quantity":2,"unit":"roll","unit_price":95,"checklist_qty":2,"checklist_unit":"roll","note":"Eaves + valleys"},
    {"name":"Drip Edge 10ft","name_es":"Goterón 10ft","category":"material","quantity":20,"unit":"pc","unit_price":8,"checklist_qty":20,"checklist_unit":"pc"},
    {"name":"Starter Strip (bundle)","name_es":"Starter strip (bundle)","category":"material","quantity":3,"unit":"bundle","unit_price":22,"checklist_qty":3,"checklist_unit":"bundle"},
    {"name":"Ridge Cap Shingles (bundle)","name_es":"Tejas de cumbrera (bundle)","category":"material","quantity":2,"unit":"bundle","unit_price":55,"checklist_qty":2,"checklist_unit":"bundle"},
    {"name":"Hip & Ridge Vent 4ft","name_es":"Ventilación de cumbrera 4ft","category":"material","quantity":6,"unit":"pc","unit_price":16,"checklist_qty":6,"checklist_unit":"pc"},
    {"name":"Roofing Nails 1¼\" (lb)","name_es":"Clavos para techo 1¼\" (lb)","category":"material","quantity":20,"unit":"lb","unit_price":4.5,"checklist_qty":20,"checklist_unit":"lb"},
    {"name":"Roof Cement / Sealant (tube)","name_es":"Cemento/sellador de techo (tubo)","category":"material","quantity":4,"unit":"tube","unit_price":8,"checklist_qty":4,"checklist_unit":"tube"},
    {"name":"Pipe Boot Flashing","name_es":"Botas para tubería","category":"material","quantity":3,"unit":"pc","unit_price":18,"checklist_qty":3,"checklist_unit":"pc"},
    {"name":"Labor – Lead Roofer","name_es":"Mano de obra – Techista principal","category":"labor","quantity":16,"unit":"hrs","unit_price":50},
    {"name":"Labor – Helper","name_es":"Mano de obra – Ayudante","category":"labor","quantity":16,"unit":"hrs","unit_price":30},
    {"name":"Dumpster / Debris removal","name_es":"Contenedor / Retiro de escombros","category":"other","quantity":1,"unit":"job","unit_price":350}
  ]'::jsonb
),

-- ── Template 3: Standing Seam Metal Roofing ──────────────────
(
  '00000000-0000-0000-0003-000000000003',
  'Standing Seam Metal Roofing',
  'Techo de Metal con Juntas Verticales',
  'Premium performance roofing. Concealed fasteners with mechanically-seamed panels provide maximum leak protection and a sleek modern aesthetic. Energy efficient (cool roof) with solar reflectance up to 70%. Ideal for low-slope to steep-slope applications with a 50+ year lifespan.',
  'Techo de alto rendimiento. Paneles con juntas mecánicas y sujetadores ocultos para máxima protección contra filtraciones y una estética moderna. Eficiente energéticamente (techo fresco) con hasta 70% de reflectancia solar. Vida útil de 50+ años.',
  'roofing',
  true,
  3,
  '[
    {"name":"Standing Seam Metal Panel 16\" (lin ft)","name_es":"Panel de metal juntas verticales 16\" (pie lineal)","category":"material","quantity":900,"unit":"lin ft","unit_price":8.5,"checklist_qty":900,"checklist_unit":"lin ft","note":"~900 lin ft per 1,000 sqft at 16\" width"},
    {"name":"Synthetic Underlayment – Metal Rated (roll)","name_es":"Underlayment sintético para metal (rollo)","category":"material","quantity":5,"unit":"roll","unit_price":80,"checklist_qty":5,"checklist_unit":"roll"},
    {"name":"Ice & Water Shield (roll)","name_es":"Membrana Ice & Water Shield (rollo)","category":"material","quantity":3,"unit":"roll","unit_price":95,"checklist_qty":3,"checklist_unit":"roll"},
    {"name":"Metal Drip Edge 10ft","name_es":"Goterón de metal 10ft","category":"material","quantity":25,"unit":"pc","unit_price":12,"checklist_qty":25,"checklist_unit":"pc"},
    {"name":"Ridge Cap (metal, 10ft)","name_es":"Cumbrera de metal (10ft)","category":"material","quantity":5,"unit":"pc","unit_price":45,"checklist_qty":5,"checklist_unit":"pc"},
    {"name":"Ridge Vent Strip 4ft","name_es":"Ventilación de cumbrera 4ft","category":"material","quantity":6,"unit":"pc","unit_price":18,"checklist_qty":6,"checklist_unit":"pc"},
    {"name":"Eave Trim 10ft","name_es":"Moldura de alero 10ft","category":"material","quantity":12,"unit":"pc","unit_price":22,"checklist_qty":12,"checklist_unit":"pc"},
    {"name":"Structural Screws (box 250)","name_es":"Tornillos estructurales (caja 250)","category":"material","quantity":4,"unit":"box","unit_price":28,"checklist_qty":4,"checklist_unit":"box"},
    {"name":"Butyl Tape / Sealant Roll","name_es":"Cinta butílica / sellador (rollo)","category":"material","quantity":6,"unit":"roll","unit_price":25,"checklist_qty":6,"checklist_unit":"roll"},
    {"name":"Labor – Metal Roofing Specialist","name_es":"Mano de obra – Especialista en metal","category":"labor","quantity":24,"unit":"hrs","unit_price":75},
    {"name":"Labor – Helper","name_es":"Mano de obra – Ayudante","category":"labor","quantity":24,"unit":"hrs","unit_price":35},
    {"name":"Crane / Lift Equipment (day)","name_es":"Grúa / equipo de elevación (día)","category":"other","quantity":1,"unit":"day","unit_price":600},
    {"name":"Dumpster / Debris removal","name_es":"Contenedor / Retiro de escombros","category":"other","quantity":1,"unit":"job","unit_price":400}
  ]'::jsonb
),

-- ── Template 4: Stone-Coated Steel ───────────────────────────
(
  '00000000-0000-0000-0004-000000000004',
  'Stone-Coated Steel (Tile/Shake Profile)',
  'Acero Recubierto de Piedra (Perfil Teja/Madera)',
  'Luxury aesthetics of clay tile or cedar shake with the lightweight strength of Galvalume steel. Class 4 impact resistance (highest UL 2218 rating) and Class A fire resistance. Ideal for hail-prone markets. 50-year warranty standard. Weighs 75% less than concrete tile — no structural reinforcement required.',
  'Estética de lujo de teja de arcilla o madera con la resistencia liviana del acero Galvalume. Resistencia al impacto Clase 4 (máxima calificación UL 2218) y resistencia al fuego Clase A. Ideal para mercados con granizo. Garantía estándar de 50 años. Pesa 75% menos que la teja de concreto.',
  'roofing',
  true,
  4,
  '[
    {"name":"Stone-Coated Steel Panel (sq)","name_es":"Panel de acero recubierto de piedra (square)","category":"material","quantity":11,"unit":"sq","unit_price":185,"checklist_qty":11,"checklist_unit":"sq","note":"1 sq = 100 sqft. Order ~10% overage."},
    {"name":"Synthetic Underlayment – Heavy Duty (roll)","name_es":"Underlayment sintético reforzado (rollo)","category":"material","quantity":5,"unit":"roll","unit_price":80,"checklist_qty":5,"checklist_unit":"roll"},
    {"name":"Ice & Water Shield (roll)","name_es":"Membrana Ice & Water Shield (rollo)","category":"material","quantity":3,"unit":"roll","unit_price":95,"checklist_qty":3,"checklist_unit":"roll"},
    {"name":"Metal Drip Edge 10ft","name_es":"Goterón de metal 10ft","category":"material","quantity":22,"unit":"pc","unit_price":12,"checklist_qty":22,"checklist_unit":"pc"},
    {"name":"Ridge Cap – Stone-Coated (lin ft)","name_es":"Cumbrera de acero recubierto (pie lineal)","category":"material","quantity":40,"unit":"lin ft","unit_price":22,"checklist_qty":40,"checklist_unit":"lin ft"},
    {"name":"Hip Cap – Stone-Coated (lin ft)","name_es":"Caballete de acero recubierto (pie lineal)","category":"material","quantity":20,"unit":"lin ft","unit_price":22,"checklist_qty":20,"checklist_unit":"lin ft"},
    {"name":"Ridge Vent Strip 4ft","name_es":"Ventilación de cumbrera 4ft","category":"material","quantity":6,"unit":"pc","unit_price":18,"checklist_qty":6,"checklist_unit":"pc"},
    {"name":"Manufacturer Screws (box 250)","name_es":"Tornillos del fabricante (caja 250)","category":"material","quantity":6,"unit":"box","unit_price":32,"checklist_qty":6,"checklist_unit":"box"},
    {"name":"Foam Closure Strips (bag)","name_es":"Tiras de cierre de espuma (bolsa)","category":"material","quantity":4,"unit":"bag","unit_price":18,"checklist_qty":4,"checklist_unit":"bag"},
    {"name":"Butyl Sealant (tube)","name_es":"Sellador de butilo (tubo)","category":"material","quantity":6,"unit":"tube","unit_price":12,"checklist_qty":6,"checklist_unit":"tube"},
    {"name":"Labor – Lead Roofer","name_es":"Mano de obra – Techista principal","category":"labor","quantity":24,"unit":"hrs","unit_price":60},
    {"name":"Labor – Helper","name_es":"Mano de obra – Ayudante","category":"labor","quantity":24,"unit":"hrs","unit_price":32},
    {"name":"Dumpster / Debris removal","name_es":"Contenedor / Retiro de escombros","category":"other","quantity":1,"unit":"job","unit_price":400}
  ]'::jsonb
)

ON CONFLICT (id) DO UPDATE SET
  name             = EXCLUDED.name,
  name_es          = EXCLUDED.name_es,
  description      = EXCLUDED.description,
  description_es   = EXCLUDED.description_es,
  default_materials = EXCLUDED.default_materials,
  sort_order       = EXCLUDED.sort_order,
  updated_at       = NOW();

COMMIT;
