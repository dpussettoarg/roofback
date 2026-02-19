# 🏠 RoofBack — El Back-Office del Techista

**"Dejá de perder plata en cada trabajo sin saberlo"**

App web ultra-simple pensada para techistas latinos (roofing contractors hispanos) en USA. Mobile-first, funciona como PWA en el celular.

## 🚀 Setup rápido (10 minutos)

### 1. Crear proyecto en Supabase (gratis)

1. Andá a [supabase.com](https://supabase.com) y creá una cuenta gratis
2. Creá un nuevo proyecto (elegí una región cercana, ej: `us-east-1`)
3. Esperá a que se cree (~2 min)
4. Andá a **SQL Editor** (menú lateral)
5. Copiá y pegá TODO el contenido de `supabase/schema.sql`
6. Hacé click en **Run** ▶️
7. Andá a **Settings → API** y copiá:
   - `Project URL` → es tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Configurar variables de entorno

Editá el archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto-real.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-real-aqui
```

### 3. Instalar y correr

```bash
cd roofback
npm install
npm run dev
```

Abrí `http://localhost:3000` en tu celular o navegador.

### 4. Configurar Auth en Supabase

1. En Supabase, andá a **Authentication → Providers**
2. Verificá que **Email** esté habilitado
3. En **Authentication → URL Configuration**:
   - **Site URL**: `https://roofback.app` (o tu dominio de producción)
   - **Redirect URLs**: agregá `https://roofback.app/**`, `https://roofback.app/auth/callback`, `https://roofback.app/login` (y `http://localhost:3000/**` para desarrollo)

## 📱 Deploy a producción (Vercel — gratis)

### Opción A: Deploy desde GitHub

1. Subí el código a un repo de GitHub
2. Andá a [vercel.com](https://vercel.com) y creá una cuenta (gratis con GitHub)
3. Click en **Import Project** → seleccioná tu repo
4. En **Environment Variables** agregá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**
6. Tu app estará en `https://tu-proyecto.vercel.app`

### Opción B: Deploy desde la terminal

```bash
npm install -g vercel
vercel
# Seguí las instrucciones, agregá las env vars cuando te pregunte
```

### Dominio personalizado (opcional, ~$12/año)

1. Comprá un dominio (ej: `roofback.app`) en Namecheap, Cloudflare, etc.
2. En Vercel → Settings → Domains → Add domain
3. Configurá los DNS como te indica Vercel

## 🏗️ Tech Stack

| Tecnología | Para qué |
|-----------|----------|
| Next.js 15 | Framework React fullstack |
| TypeScript | Tipado seguro |
| Tailwind CSS | Estilos |
| shadcn/ui | Componentes UI |
| Supabase | Auth + Base de datos + Storage |
| Recharts | Gráficos |
| Lucide | Iconos |

## 📊 Funcionalidades

- ✅ Login/Registro (email + password)
- ✅ Dashboard con métricas del mes y gráfico de ganancias
- ✅ Crear trabajos (datos del cliente + tipo de techo)
- ✅ Presupuesto automático con templates por tipo de trabajo
- ✅ Checklist de materiales auto-generada
- ✅ Registro de horas del crew + gastos extras
- ✅ Resultados: estimado vs real con indicador de ganancia/pérdida
- ✅ Generación de PDF para enviar al cliente
- ✅ Bilingüe (Español / English)
- ✅ PWA instalable en celular
- ✅ Settings: perfil, defaults, idioma

## 💰 Costo de operación

| Servicio | Costo |
|---------|-------|
| Vercel (hosting) | $0/mes (free tier) |
| Supabase (DB + Auth) | $0/mes (free tier: 500MB DB, 50K users) |
| Dominio (opcional) | ~$12/año |
| **TOTAL** | **$0 - $1/mes** |

## 📁 Estructura del proyecto

```
roofback/
├── app/
│   ├── layout.tsx              # Layout raíz
│   ├── page.tsx                # Redirect a /dashboard
│   ├── login/page.tsx          # Login y registro
│   ├── dashboard/page.tsx      # Dashboard principal
│   ├── jobs/
│   │   ├── page.tsx            # Lista de trabajos
│   │   ├── new/page.tsx        # Crear trabajo
│   │   └── [id]/
│   │       ├── page.tsx        # Detalle del trabajo
│   │       ├── estimate/       # Presupuesto
│   │       ├── checklist/      # Checklist materiales
│   │       ├── timetrack/      # Registro de horas
│   │       └── results/        # Resultados
│   └── settings/page.tsx       # Configuración
├── components/
│   ├── app/mobile-nav.tsx      # Navegación móvil
│   ├── providers.tsx           # Context providers
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── supabase/               # Supabase clients
│   ├── i18n/                   # Traducciones ES/EN
│   ├── templates.ts            # Templates de materiales
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utilidades
├── supabase/
│   └── schema.sql              # Schema completo de DB
└── public/
    ├── manifest.json           # PWA manifest
    └── sw.js                   # Service worker
```
