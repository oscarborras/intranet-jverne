# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@.agents/rules/programacion.md

## Project Overview

Intranet web application for IES Julio Verne school. Named **"Intranet-jv"** in production (student relations/coexistence management). Built with Next.js + TypeScript + Supabase.


## Tech Stack

- Framework: **Next.js 16 con App Router y Server Components**
- UI: **Tailwind CSS v4**
- UI Icons: **Lucide React**
- **Backend/DB / Auth**: Supabase (local dev MCP server at `http://localhost:8080/mcp`)
- **Tipado:** Es obligatorio el uso de TypeScript. No se permite el uso de `any`. Define interfaces para cada objeto de datos.
- **Librería principal:** Recharts + shadcn/ui.
- **Production runtime**: PM2 (process name: `intranet-jv`)

## Reglas de Visualización
- **La aplicación debe ser responsive, adaptada totalmente a móviles (Mobile-first) con botones fáciles de pulsar.
- **Estilo:** Usa siempre variables de color de Tailwind (`var(--chart-1)`, etc.).
- **Accesibilidad:** Todos los gráficos deben incluir `ChartTooltip` y etiquetas de accesibilidad.
- **Ubicación:** Los componentes de gráficas personalizados deben ir en `src/components/charts/`.
- **Lenguaje:** Escribe todo el código, nombres de variables y comentarios en **Inglés**.
- **Interfaz de Usuario:** Los textos visibles para el usuario final deben estar en **Español**.

## Autenticación y sesiones — REGLAS CRÍTICAS

### Paquetes correctos
- Usar SIEMPRE `@supabase/ssr` (NO `@supabase/auth-helpers-nextjs`, está deprecado)
- Instalar: `@supabase/supabase-js` + `@supabase/ssr`

### Tres clientes obligatorios
- `lib/supabase/server.ts` → para Server Components, Route Handlers y Server Actions
- `lib/supabase/client.ts` → para Client Components
- `middleware.ts` (raíz) → refresca el token en cada request

### Regla getUser() vs getSession()
- En el servidor: usar SIEMPRE `supabase.auth.getUser()` (verifica con Supabase)
- NUNCA usar `getSession()` en el servidor (no valida el JWT)
- En Client Components: `getSession()` es aceptable

### Protección de rutas
- El middleware protege rutas redirigiendo a `/login` si no hay sesión
- Los Server Components hacen una segunda verificación con `getUser()`
- NUNCA confiar solo en el cliente para proteger rutas

# Requisitos funcionales:
Control de sesión de usuario eficiente y seguro y control de acceso a página según perfil.
Dashboard para acceso a todas las funcionalidades con visualización de ultimos anuncios e incidencias abiertas.
Calendario para consulta de eventos, reserva de espacios y recursos y consulta de días de libre disposición.
Tablón de anuncios.
Gestión de incidencias TIC
Gestión de incidencias de mantenimiento de las instalaciones del Centro.
Reservas de espacios (SUM, sala de visitas) y carros de portátiles (Carro 1, 2 y 3)
Gestión de citas con familias del profesorado y directiva.



## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
```

## Production Deployment

See `doc/Install_produccion_frontend.md` for full PM2 setup. Key steps:
1. Copy `.env_local` via SSH (not in git)
2. `npm run build`
3. `pm2 reload intranet` (zero-downtime reload)
4. `pm2 logs intranet` (view logs)

Environment file must be obtained separately — it is never committed.

## Supabase (Local Dev)

The MCP server for Supabase is configured in `.mcp.json` and runs locally at `http://localhost:8080/mcp`. Use the `mcp__supabase-local__*` tools for schema inspection, SQL execution, and migrations.

When writing SQL or designing schemas, apply the guidelines in `.agents/skills/supabase-postgres-best-practices/` — prioritized by impact (CRITICAL: indexes, connections, RLS; HIGH: schema design).

## Agent Skills

Three agent skill guides are available under `.agents/skills/`:

- **`supabase-postgres-best-practices/`** — Postgres performance rules (indexes, RLS, connection pooling, query optimization)
- **`react-components/`** — React component generation following Atomic Design
- **`vercel-react-best-practices/`** — React performance rules (bundle size, server/client data fetching, re-render optimization)

## Commit Convention

```
feat(scope): description
fix(scope): description
refactor(scope): description
docs(scope): description
test(scope): description
```
