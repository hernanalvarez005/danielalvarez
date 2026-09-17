# Daniel Alvarez — Servicios Agropecuarios

Plataforma de gestión operativa para **Daniel Alvarez Servicios
Agropecuarios**, contratista rural en Argentina (pulverizaciones, siembras
y cosechas). Este repositorio contiene las **fundaciones del proyecto**:
autenticación, arquitectura base, modelo multiempresa y shell visual. El
primer módulo operativo, **Pulverizaciones**, se construye sobre esta base
en una etapa posterior.

## Objetivo del proyecto

Reemplazar el doble control manual de pulverizaciones (orden de trabajo del
ingeniero vs. talonario del aplicador) por un único flujo:

```
Orden de trabajo → Receta → Ejecución → Cargas de tanque
  → Finalización → Conciliación previsto vs. real → Revisión del ingeniero
```

Ese flujo todavía no está implementado. Esta etapa deja lista la base sobre
la que se va a construir: login, multiempresa, roles, layout autenticado y
navegación.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack)
- TypeScript (modo estricto)
- Tailwind CSS v4
- [shadcn/ui](https://ui.shadcn.com) (sobre [Base UI](https://base-ui.com), no Radix)
- [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security
- Despliegue: Vercel

## Requisitos

- Node.js 20+
- Una cuenta y proyecto de Supabase

## Instalación

```bash
npm install
```

## Variables de entorno

Copiá `.env.example` a `.env.local` y completá con los datos de tu proyecto
Supabase (Project Settings → API):

```bash
cp .env.example .env.local
```

| Variable                        | Dónde se usa                          | Pública |
| -------------------------------- | -------------------------------------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Cliente browser y servidor             | Sí      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Cliente browser y servidor             | Sí      |
| `SUPABASE_SERVICE_ROLE_KEY`      | Scripts de servidor (seed, admin)      | **No**  |

La `service_role` key nunca se usa en código que corre en el browser ni se
commitea. Solo se usa en scripts locales (`scripts/`) ejecutados a mano.

## Base de datos y migraciones

El schema vive versionado en `supabase/migrations/`. No se hacen cambios
manuales al schema que no queden reflejados en una migración.

Para aplicar las migraciones a un proyecto Supabase remoto necesitás la
Supabase CLI autenticada (`npx supabase login`, requiere un access token de
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens))
o la contraseña de la base:

```bash
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

Si no tenés la CLI vinculada, copiá el contenido de cada archivo en
`supabase/migrations/` (en orden) y ejecutalo desde el **SQL Editor** del
dashboard de Supabase.

Para desarrollo local con Docker:

```bash
npx supabase start
npx supabase db reset
```

### Usuario de prueba

Después de aplicar la migración inicial, podés crear una organización y un
usuario admin de prueba con:

```bash
node --env-file=.env.local scripts/seed-admin.mjs
```

El script es idempotente: si el usuario o la organización ya existen, los
reutiliza. Imprime el email/contraseña generados al final.

## Ejecución local

```bash
npm run dev
```

## Modelo multiempresa

La plataforma es multiempresa desde el modelo de datos, aunque el MVP
trabaje con una sola organización activa por usuario.

- **`organizations`** — una empresa contratista.
- **`profiles`** — datos públicos de cada usuario (`auth.users` 1:1).
- **`organization_members`** — la membresía de un usuario en una
  organización, con el `role` que determina sus permisos. Un usuario puede
  en principio pertenecer a más de una organización; la UI actual solo
  expone la primera membresía activa.

El `organization_id` **nunca se confía desde el cliente** para autorizar
acceso a datos: toda lectura/escritura está protegida por Row Level
Security (RLS) evaluada en la base de datos, no en el frontend.

## Roles

| Rol          | Alcance                                                          |
| ------------ | ----------------------------------------------------------------- |
| `admin`      | Acceso general, configuración, gestión de usuarios                |
| `engineer`   | Backoffice operativo (crea y revisa órdenes en etapas futuras)    |
| `applicator` | Acceso operativo limitado, pensado para uso desde celular en campo |

La lógica de permisos está centralizada en
[`lib/permissions/roles.ts`](lib/permissions/roles.ts) (`can(role, capability)`,
`hasRole(role, allowed)`) para evitar condicionales de rol dispersos por los
componentes.

## Estrategia de RLS

- RLS está habilitado en las tres tablas del MVP; no hay políticas del
  estilo `USING (true)`.
- Dos funciones `SECURITY DEFINER` (`is_org_member`, `is_org_admin`) evalúan
  membresía/rol sin causar recursión de políticas sobre
  `organization_members` (patrón estándar de Supabase para este problema).
- `organizations`: los miembros activos pueden leer su organización; solo
  los `admin` pueden actualizarla. No hay política de creación/borrado
  desde el cliente en esta etapa.
- `profiles`: cada usuario lee/edita su propio perfil; además puede leer el
  perfil de otros usuarios que compartan alguna de sus organizaciones.
- `organization_members`: los miembros activos de una organización pueden
  ver la lista de miembros; solo los `admin` pueden agregar, modificar o
  quitar miembros.

## Auditoría (preparado, no implementado)

El modelo deja espacio para incorporar más adelante una tabla `audit_log`
que registre quién creó/modificó/ejecutó/revisó cada orden de pulverización
y sus cantidades. No se implementa en esta etapa.

## Estructura del proyecto

```
app/
  login/              Página de login (pública)
  (app)/              Rutas protegidas (requieren sesión)
    dashboard/
    pulverizaciones/   Módulo activo (placeholder de esta etapa)
    clientes/ campos/ productos/ aplicadores/   Placeholders del MVP futuro
    proximamente/[modulo]/   Módulos aún no desarrollados
    configuracion/
components/
  ui/                 Componentes shadcn/ui (Base UI)
  layout/             Sidebar, topbar, navegación mobile, menú de usuario
  shared/             EmptyState, ComingSoon, PageHeader
  dashboard/          Piezas específicas del dashboard
  auth/               Formulario de login
lib/
  supabase/           Clientes Supabase (browser, server, proxy)
  auth/               Server Actions de auth + resolución de sesión/organización
  permissions/         Roles y capacidades centralizadas
  navigation.ts       Configuración del sidebar (única fuente de verdad)
types/
  database.ts         Tipos de la base de datos (a mano; ver nota abajo)
supabase/
  migrations/         Schema versionado
scripts/
  seed-admin.mjs      Crea organización + usuario admin de prueba
proxy.ts              Refresca sesión y protege rutas privadas (ex-middleware)
```

> Nota sobre `types/database.ts`: está escrito a mano para esta etapa
> inicial. Cuando el schema crezca, generalo desde la CLI con
> `npx supabase gen types typescript --linked > types/database.ts` para que
> quede sincronizado automáticamente.

## Autenticación

- Implementada con `@supabase/ssr` (cliente browser + cliente servidor +
  refresco de sesión en `proxy.ts`, la convención de Next.js 16 que
  reemplaza a `middleware.ts`).
- `/login` es la única ruta pública; todo lo demás requiere sesión.
- El logout es un Server Action (`lib/auth/actions.ts`).
- No hay flujo de alta pública: los usuarios se provisionan por un admin
  (en esta etapa, vía `scripts/seed-admin.mjs` o el dashboard de Supabase).

## Identidad visual

- Paleta de marca (verde oscuro `#253522`) definida como tokens de diseño
  en [`app/globals.css`](app/globals.css) (`--primary`, `--sidebar*`,
  `--success`, `--warning`, junto con los tokens estándar de shadcn). Nada
  de color hardcodeado en componentes: todo pasa por estos tokens, con
  variantes para modo oscuro.
- El sidebar usa el verde de marca como fondo; el resto de la app se
  mantiene neutro (blanco/gris) para evitar sobrecargar de verde.
- [`components/layout/brand.tsx`](components/layout/brand.tsx) expone
  `Brand` (marca compacta + wordmark, para sidebar/topbar/drawer mobile) y
  `BrandMark` (logo circular completo, para la pantalla de login), ambos
  usando `public/logo.jpeg`.
- [`components/shared/status-badge.tsx`](components/shared/status-badge.tsx)
  centraliza el vocabulario de estados de las futuras órdenes de trabajo
  (Pendiente/En ejecución/Para revisar/Finalizado/Cancelado), siempre con
  ícono + texto, nunca solo color.

## Deploy en Vercel

1. Importar el repositorio en Vercel (framework Next.js, detectado
   automáticamente; no hace falta `vercel.json`).
2. Configurar en el proyecto de Vercel (Production, Preview y Development)
   solo estas dos variables, ambas públicas a propósito:
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   **No** configures `SUPABASE_SERVICE_ROLE_KEY` en Vercel — la app en
   runtime nunca la necesita (el server client usa la anon key + la sesión
   del usuario, protegida por RLS); esa key solo se usa en
   `scripts/seed-admin.mjs`, ejecutado a mano en local.
3. En Supabase → Authentication → URL Configuration, seteá **Site URL** a
   la URL de producción de Vercel, y agregá esa misma URL (y la de cada
   preview que uses) a **Redirect URLs**. No es estrictamente necesario
   para el login por password de esta fase, pero lo dejás listo para
   magic link / reset de contraseña más adelante.
4. Deploy.

## Calidad

```bash
npm run lint     # ESLint
npx tsc --noEmit # TypeScript estricto
npm run build    # Build de producción
```
