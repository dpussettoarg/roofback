# RoofBack — Brief de Auditoría de Código

Documento para facilitar una auditoría de seguridad y calidad por otra IA o equipo de desarrollo.

---

## 1. Resumen del Proyecto

**RoofBack** es una app web de back-office para techistas (roofing contractors). Permite gestionar trabajos, presupuestos, checklist de materiales, registro de horas y envío de propuestas a clientes para aprobación.

- **Stack:** Next.js 16, React 19, TypeScript, Supabase (Auth + DB + Storage), Stripe (suscripciones), Netlify
- **Dominio producción:** https://roofback.app

---

## 2. Estructura del Proyecto

```
roofback/
├── app/
│   ├── page.tsx                 # Raíz: redirige a /dashboard o procesa hash auth
│   ├── layout.tsx
│   ├── login/page.tsx           # Login, signup, forgot password, Google OAuth
│   ├── auth/
│   │   ├── callback/page.tsx    # Procesa #access_token y ?code= (PKCE)
│   │   └── reset-password/page.tsx
│   ├── dashboard/page.tsx
│   ├── settings/page.tsx
│   ├── debug/page.tsx           # ⚠️ /debug?secret=XXX — diagnóstico env, REMOVER en prod
│   ├── proposal/[token]/page.tsx # ⚠️ PÚBLICO: ver/aprobar presupuesto por token
│   ├── jobs/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx, estimate/, checklist/, timetrack/, results/
│   ├── api/
│   │   ├── webhooks/stripe/route.ts  # Webhook Stripe (verifica firma)
│   │   └── ai/improve-description/route.ts  # ⚠️ Sin auth — usa OpenAI
│   └── actions/stripe.ts        # Server Action: createCheckoutSession
├── lib/
│   ├── supabase/client.ts       # createBrowserClient (cliente navegador)
│   ├── supabase/server.ts       # createServerClient (Server Components/Actions)
│   ├── supabase/admin.ts        # supabaseAdmin con service_role — bypasea RLS
│   ├── stripe.ts
│   ├── utils.ts                 # getURL(), cn()
│   ├── types.ts, templates.ts, i18n/
├── components/
├── middleware.ts                # Auth: protege rutas, redirige / → /dashboard o /login
└── supabase/
    ├── schema.sql               # Tablas base + RLS
    ├── migration_estimates.sql  # ⚠️ public_token, políticas públicas
    ├── migration_workflow.sql, migration_stripe.sql, migration_features_v2.sql
```

---

## 3. Flujo de Autenticación

1. **Login/registro:** Email+password o Google OAuth
2. **Supabase** redirige a `redirectTo` (getURL('/auth/callback')) con tokens en hash `#access_token=...` o en `?code=` (PKCE)
3. El hash **nunca llega al servidor**; `/auth/callback/page.tsx` es una página cliente que:
   - Parsea el hash o el code
   - Llama a `setSession()` o `exchangeCodeForSession()`
   - Redirige a `/dashboard`
4. Si Supabase redirige a `/` con hash, `app/page.tsx` redirige a `/auth/callback` preservando el hash
5. **Middleware:** rutas públicas: `/`, `/login`, `/auth`, `/proposal`, `/api/webhooks/stripe`, `/debug`

---

## 4. Puntos Críticos para Auditoría

### 4.1 Seguridad — RLS y Datos Públicos

**Políticas en `migration_estimates.sql` (CRÍTICO):**

```sql
CREATE POLICY "Public can view job by token" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Public can approve job by token" ON public.jobs FOR UPDATE
  USING (public_token IS NOT NULL) WITH CHECK (public_token IS NOT NULL);
CREATE POLICY "Public can view estimate items by job" ON public.estimate_items FOR SELECT USING (true);
CREATE POLICY "Public can view profiles for proposals" ON public.profiles FOR SELECT USING (true);
```

- **jobs SELECT `USING (true)`** → Cualquier cliente anónimo podría leer **todos** los jobs (no solo por token). ¿Se ejecutó esta migración? Si es así, es una **fuga de datos grave**.
- **jobs UPDATE** → Cualquier usuario puede actualizar cualquier job con `public_token` no nulo (todos lo tienen). Un atacante con un UUID válido podría aprobar/rechazar jobs ajenos.
- **estimate_items, profiles** → SELECT público sin restricción.

**Sugerencia de política correcta para jobs (conceptual):**

- SELECT: `USING (auth.uid() = user_id OR (auth.role() = 'anon' AND public_token = $request_token))` — requiere un mecanismo para pasar el token en la política (p.ej. función o RPC).
- UPDATE: solo campos `client_status`, `client_signature`, `approved_at` cuando `public_token` coincide con el token de la request (vía RPC o función `security definer`).

### 4.2 Página de Propuestas (`/proposal/[token]`)

- **Ruta pública** (middleware)
- Usa `createClient()` (cliente navegador, anon key)
- Hace: `jobs.select().eq('public_token', token)`, `profiles.select()`, `estimate_items.select()`
- **Update:** `jobs.update({ client_status, client_signature, approved_at }).eq('public_token', token)`
- Cualquiera con el token puede aprobar el presupuesto. El token UUID es difícil de adivinar pero no imposible; conviene tener expiración o rotación.

### 4.3 API `/api/ai/improve-description`

- **No verifica autenticación.** Cualquiera puede POST y consumir OpenAI.
- Riesgo: abuso (coste API), ataques de prompt injection.
- Recomendación: validar sesión Supabase antes de procesar.

### 4.4 Página de Debug (`/debug`)

- Protegida por query: `?secret=roofback-debug` (default) o `DEBUG_PAGE_SECRET`
- Muestra estado de variables de entorno (enmascaradas)
- **Debe deshabilitarse o eliminarse en producción.**

### 4.5 Webhook Stripe

- Verifica `stripe-signature` con `STRIPE_WEBHOOK_SECRET`
- Usa `supabaseAdmin` para actualizar `profiles` (bypasea RLS)
- Actualiza por `user_id` (checkout) o `stripe_customer_id` (subscription events)

### 4.6 Cliente Supabase Admin

- `lib/supabase/admin.ts`: usa `SUPABASE_SERVICE_ROLE_KEY`
- Solo usado en `api/webhooks/stripe/route.ts` (server-side)
- **Nunca** exponer este cliente al navegador.

---

## 5. Variables de Entorno

| Variable | Uso | Crítico |
|----------|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API | Sí |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente público | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, admin | Sí (server) |
| `NEXT_PUBLIC_SITE_URL` | Redirects auth, Stripe | Sí (prod) |
| `STRIPE_SECRET_KEY` | Checkout, webhooks | Sí |
| `STRIPE_WEBHOOK_SECRET` | Verificación webhook | Sí |
| `OPENAI_API_KEY` | API /api/ai/improve-description | Opcional |
| `DEBUG_PAGE_SECRET` | Protección /debug | Recomendado |

---

## 6. Posibles Vulnerabilidades a Revisar

1. **RLS en jobs/estimate_items/profiles** — políticas demasiado amplias en migraciones
2. **API AI sin auth** — abuso y costes
3. **Debug en producción** — exposición de configuración
4. **Proposal token** — falta de rate limit, expiración, o rotación
5. **Inyección/SQL** — Supabase usa parametrización; revisar usos directos de SQL
6. **XSS** — React escapa por defecto; revisar `dangerouslySetInnerHTML` o renderizado de HTML crudo
7. **CSRF** — Server Actions y API routes; revisar origen y headers si aplica
8. **Validación de inputs** — job creation, estimate items, profile updates; comprobar tipos y rangos

---

## 7. Archivos Clave para Revisar

| Archivo | Razón |
|---------|-------|
| `supabase/migration_estimates.sql` | Políticas RLS públicas |
| `app/proposal/[token]/page.tsx` | Lógica de aprobación pública |
| `app/api/ai/improve-description/route.ts` | Sin auth, uso de OpenAI |
| `app/debug/page.tsx` | Diagnóstico en producción |
| `app/api/webhooks/stripe/route.ts` | Verificación webhook, actualizaciones admin |
| `middleware.ts` | Protección de rutas |
| `lib/supabase/admin.ts` | Uso de service_role |
| `app/auth/callback/page.tsx` | Procesamiento de tokens de auth |

---

## 8. Schemas de Base de Datos (Resumen)

- **profiles:** id (FK auth.users), email, full_name, company_name, phone, defaults, stripe_*, subscription_*
- **jobs:** user_id, client_*, job_type, roof_type, estimated_total, public_token, client_status, client_signature, approved_at, workflow_stage, photos, etc.
- **estimate_items:** job_id, category, name, quantity, unit_price, etc.
- **material_checklist, time_entries, expenses, activity_logs:** vinculados a jobs

---

## 9. Checklist de Auditoría Sugerido

- [ ] Revisar todas las políticas RLS en schema y migraciones
- [ ] Confirmar que `/api/ai/*` requiere autenticación
- [ ] Deshabilitar o eliminar `/debug` en producción
- [ ] Ajustar políticas públicas de jobs/estimate_items/profiles para scope mínimo
- [ ] Validar que `getURL()` usa siempre origen confiable en redirects
- [ ] Revisar manejo de errores (no filtrar stack traces a cliente)
- [ ] Comprobar que `service_role` solo se usa en contexto servidor
- [ ] Revisar CORS y headers de seguridad si hay APIs externas

---

*Documento generado para auditoría. Última actualización: Feb 2026.*
