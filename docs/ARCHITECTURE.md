# Arquitectura — `vende-rag` (Vende Web)

> Estado del arte arquitectónico del **frontend**: estructura, su relación con el API, patrones,
> y puntos fuertes y débiles. Documento de referencia para onboarding y para exponer el proyecto.
>
> Diagramas complementarios (Excalidraw) en `docs/diagrams/`:
> - `vende-clean-architecture.excalidraw` — mapeo de carpetas a las capas de Clean (onion).
> - `vende-request-flow.excalidraw` — flujo de datos front ↔ API de punta a punta.

---

## 1. Panorama general

Portal **web de vendedores** (`vende.rag.mx`): el vendedor sube y gestiona sus productos. **No** es
un carrito de compras. Reemplaza el sitio legacy y **consume el API REST autenticado por JWT**
(`api_rga`, prefijo `/api/web/*`).

### Stack

| Categoría | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Estilos | Tailwind CSS v4 (mobile-first) |
| Estado servidor / cache | TanStack Query v5 |
| Validación en frontera | Zod (runtime, en cada respuesta del API) |
| Testing | Vitest + Testing Library (unit) · Playwright (e2e, fase 2) |
| Calidad | ESLint (`eslint-plugin-boundaries`) + Prettier + lint-staged |

---

## 2. Arquitectura: Clean Architecture **feature-sliced**

```
src/
  shared/                      # transversal
    domain/                    # value objects, errores base
    infrastructure/            # http client, query client, env, imágenes, i18n
    ui/                        # design system (primitivos)
  features/<feature>/          # account, auth, contact, designers, faq, home,
    domain/                    #   info, listings, privacy, product-views, terms
    application/
    infrastructure/
    presentation/
app/                           # SOLO routing — páginas finas que componen features
```

**11 features**: `account`, `auth`, `contact`, `designers`, `faq`, `home`, `info`, `listings`,
`privacy`, `product-views`, `terms`. Cada una es autónoma y se corta en 4 capas.

### Regla de dependencia — **impuesta por ESLint** (`eslint-plugin-boundaries`)

Este es el punto más fuerte: la regla no es solo convención, **la valida el linter**.

| Capa | Puede importar de |
|---|---|
| `domain/` | **nada** (puro) |
| `application/` | `domain/`, `shared-domain` |
| `infrastructure/` | `domain/`, `application/`, `shared-domain`, `shared-infra` |
| `presentation/` | `application/`, `domain/` (solo tipos), `shared-ui`, `shared-domain` |
| `app/` | `presentation/`, `infrastructure`, `shared-ui`, `shared-infra` |

Nunca al revés. Nunca cruzar entre features sin pasar por `shared/`.

---

## 3. Capas y qué contiene cada una

### 🟢 Dominio (`features/*/domain/` + `shared/domain/`)
Entidades, **interfaces de repositorio (puertos)**, tipos y errores de dominio. **Puro**: no importa
de ninguna otra capa. Ej.: `product-view-repository.ts` (interfaz `ProductViewRepository` + tipos
`Product`, `ProductDetail`, `DiscountType`…), `shared/domain/errors.ts`.

### 🔵 Aplicación (`features/*/application/`)
Casos de uso, DTOs y **query keys** de TanStack Query. Ej.: `apply-discount.usecase.ts`,
`remove-discount.usecase.ts`, `product-view-query-keys.ts`. Solo dependen del dominio.

### 🟠 Infraestructura (`features/*/infrastructure/` + `shared/infrastructure/`)
**Implementaciones** de los repositorios (HTTP), **schemas Zod** y mappers de API. Ej.:
`product-view-http-repository.ts` (implementa el puerto llamando al API), `product-view-schemas.ts`
(Zod). En `shared/infrastructure/`: `http/http-client.ts`, `http/token-storage.ts`,
`query/` (QueryClient + provider), `env/env.ts`, `images/`, `i18n/`.

### 🟣 Presentación (`features/*/presentation/` + `shared/ui/`)
Componentes React y **hooks** (wrappers de `useQuery`/`useMutation`). Ej.: `product-detail-screen.tsx`,
`use-apply-discount.ts`. La DI se hace por **React Context**: providers inyectan la implementación del
repositorio (`useProductViewRepository()`), así el hook/usecase depende de la **interfaz**, no del HTTP.

### 🔴 Frameworks / Externa (`app/` + Next.js + React + Navegador + API)
`app/` es **solo routing** (páginas que componen presentación). Fuera del código: Next.js runtime,
el navegador, y el **API REST** que consume.

---

## 4. Relación con el API (`api_rga`)

- **Contrato:** REST JSON sobre `/api/web/*`, autenticado por **JWT Bearer**.
- **HTTP client** (`shared/infrastructure/http/http-client.ts`):
  - Base URL por entorno: `env.server.BACKEND_URL` (SSR) vs `env.NEXT_PUBLIC_BACKEND_URL` (cliente).
  - Adjunta `Authorization: Bearer <token>` leído de **localStorage** (`token-storage.ts`).
  - **Valida cada respuesta con Zod** en la frontera → si el API cambia el shape, falla en runtime
    de forma controlada (`ValidationError`).
  - Errores: `401 → UnauthorizedError`, resto `→ HttpError`.
- **Repository pattern + DI:** `presentation → usecase → interfaz de repo (dominio) → impl HTTP
  (infra)`. La impl se inyecta por contexto.
- **Sesión y auth:**
  - Token en **localStorage**; `AuthGuard` (`require-auth` / `require-guest`) protege las páginas
    client-side y redirige a `/welcome` si no hay sesión completa.
  - **Handler global de 401** (en el QueryClient): limpia sesión y hace `window.location.replace('/welcome')`.
  - Convención de códigos: **401** = sesión inválida/expirada (redirige); **403** = negocio
    (autenticado sin permiso, no redirige).
- **Data fetching (real):** hoy **todas** las lecturas y mutaciones corren en el **cliente** vía
  **TanStack Query** → `http-client` → `/web/*`. Los Server Components existentes son solo páginas de
  contenido estático y **no** consultan el API. Detalle en **§5**.

---

## 5. Next.js — Server Components, Client Components y route handlers

Cómo el framework (**Next.js 16 App Router + React 19**) se relaciona con las librerías de datos
(**TanStack Query, Zod, `fetch`**) y cómo se gestionan las peticiones.

### 5.1 Server vs Client Components (uso real)

vende es, en la práctica, **client-first**: casi todo el árbol es Client Component (`'use client'`).
La frontera es clara y deliberada:

| Superficie | Tipo | Por qué |
|---|---|---|
| **Root layout** (`app/layout.tsx`) | 🟩 **Server** | Exporta `metadata`, monta fuentes, `GoogleTag` y el shell. Sin estado de cliente. |
| **Páginas públicas / estáticas** (`welcome`, `login`, `signup`, `contacto`, `terminos`, `privacidad`, `preguntas-frecuentes`, `disenadores`, `informacion`, `forgot-password`) | 🟩 **Server** | Contenido estático / SEO; se renderizan en el servidor. **No** hacen fetch de datos del API. |
| **App autenticada** (`home`, `publicaciones`, `vender`, `productos/[id]`, `perfil/*`, `mis-ventas`, `devoluciones`, `solicitudes`, `reset-password`) | 🟦 **Client** (`'use client'`) | La sesión vive en **localStorage** (no cookie), así que `AuthGuard` y las lecturas (TanStack Query) **solo** pueden existir en el cliente. |

**Composición:** `app/layout.tsx` (Server) envuelve `<Providers>` (**boundary Client**:
`QueryClientProvider` + los `RepositoryProvider` de cada feature + `GoogleOAuthProvider`). Debajo de
esa frontera, todo es Client Component. Las páginas cliente son **delgadas**: leen params, montan
`<AuthGuard>` y renderizan un `*Screen` de la feature.

> ⚠️ **Nota honesta:** `CLAUDE.md` describe una estrategia con *Server Components para lecturas
> SEO/cacheables* (`use cache` / `<Suspense>`). **Hoy no está implementada así**: las lecturas de datos
> (incluido `productos/[id]`) corren en el **cliente** vía TanStack Query, y los Server Components solo
> sirven contenido estático. Es deuda/decisión pendiente, no el estado actual.

### 5.2 Route handlers (¿se generó API dentro de Next?)

A diferencia del **Front Admin** (`front-rag`), que sí construyó un **BFF** de 169 route handlers,
vende **no tiene BFF**: el cliente habla **directo** con `api_rga`. La única excepción es **un** route
handler:

- **`app/api/upload/route.ts`** — proxy **multipart** para imágenes. El navegador sube los archivos a
  este handler (mismo origen), que los **reenvía** al API (`/web/products/staging-images` o
  `/:id/images`), renombra el campo `files → images`, adjunta el `Authorization` y aplica timeout.
  Existe porque conviene un punto en el servidor para el `FormData`; el resto de peticiones (JSON) no
  lo necesita.

### 5.3 Cómo se gestionan las peticiones (framework ↔ librerías)

Dos caminos, ambos desde Client Components:

**a) Datos (JSON) — el 99%**

```
Client Component
 → hook TanStack Query (useQuery / useMutation)     # cache, estados, invalidación
   → usecase (application)
     → interfaz de repo (domain, puerto)
       → *HttpRepository (infrastructure)
         → httpRequest()  (shared/infrastructure/http/http-client.ts)
           → fetch(`${BASE}/web/*`)                 # BASE = NEXT_PUBLIC_BACKEND_URL en cliente
              Authorization: Bearer <token de localStorage>
              respuesta → Zod safeParse (valida el shape)
              401 → UnauthorizedError → handler global (QueryClient) → /welcome
```

- **`fetch` nativo** (no axios): `http-client.ts` es un wrapper minimalista.
- **`resolveBaseUrl()`**: `env.server.BACKEND_URL` (SSR) vs `NEXT_PUBLIC_BACKEND_URL` (cliente). Como
  las peticiones corren en el cliente, gana la rama `NEXT_PUBLIC_*`; la rama SSR queda lista por si
  algún Server Component llegara a consultar el API.
- **TanStack Query** orquesta cache/refetch/estados; el `http-client` solo transporta y valida.
- **Zod** valida en la frontera de `infrastructure`: el contrato con el API se verifica en runtime.

**b) Subida de imágenes (multipart)**

```
Client (FormData) → POST /api/upload (route handler, server Next) → API /web/products/…images
```

Es el **único** tramo que pasa por el servidor de Next (ver §5.2).

---

## 6. Patrones implementados (fortalezas)

- ✅ **Clean Architecture estricta y *enforced por ESLint*** (no solo convención).
- ✅ **Feature-sliced**: alta cohesión, features aisladas; cruce solo por `shared/`.
- ✅ **Repository pattern + Inyección de dependencias por Context** → testeable y sustituible.
- ✅ **Zod en la frontera** → seguridad en runtime contra cambios del API.
- ✅ **TypeScript strict** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
- ✅ **Frontera Server/Client explícita** (§5): root layout + páginas estáticas en el servidor;
  app autenticada 100% cliente con TanStack Query. Sin BFF (solo `/api/upload` como proxy multipart).
- ✅ **Tests bajo `test/`** espejando `src/` (Vitest solo recoge `test/**`).

---

## 7. Puntos débiles / deuda técnica

1. **Contrato con el API es manual**: los schemas Zod deben mantenerse en sync con las respuestas del
   API. Si el backend cambia un campo, se detecta en **runtime** (no en compilación) → riesgo de drift.
2. **Token en localStorage** (no cookie httpOnly): superficie de XSS y el SSR no puede leer la sesión
   (la protección real es client-side vía `AuthGuard` + handler 401).
3. **Duplicación de layout** en componentes grandes (ej. `product-detail-screen` repite el bloque de
   precio para mobile y desktop).
4. **Lógica que debería vivir en el backend** puede filtrarse al front (ya corregimos el caso de
   marcas excluidas moviéndolo al API); hay que vigilar que las reglas de negocio no se dupliquen aquí.
5. **Sin e2e todavía** (Playwright es fase 2); la cobertura es unit.
6. **Boilerplate por feature**: 4 capas + providers de contexto por repositorio generan varios
   archivos para features simples.

---

## 8. Convenciones (resumen)

- **Named exports** (default solo donde Next lo exige: `page/layout/route/...`).
- **kebab-case** en archivos; componentes `UpperCamelCase` dentro.
- **No `any`**: `unknown` + narrow; validar con Zod en frontera, confiar internamente.
- **Errores**: subclases de `shared/domain/errors.ts`; `catch (unknown)` + `instanceof`.
- **UI en español**; código/identificadores/commits en inglés.
- **Mobile-first**: CSS phone-first, escalar con breakpoints.
- **Tests en `test/`** (nunca colocados junto al código; Vitest solo recoge `test/**`).

---

## 9. Cómo agregar un consumo del API (patrón repetible)

1. **Dominio** — método en la interfaz del repo (`features/<f>/domain/*-repository.ts`) + tipos.
2. **Infra** — impl HTTP (`*-http-repository.ts`) + **schema Zod** (`*-schemas.ts`).
3. **Aplicación** — `*.usecase.ts` que llama la interfaz.
4. **Presentación** — hook (`use-*.ts`) con `useQuery`/`useMutation` (invalida las query keys).
5. **Componente** — consume el hook; UI en `presentation/components/`.
6. **Test** — en `test/features/<f>/...` espejando la ruta.

---

### Resumen en una frase

> **Clean Architecture feature-sliced, estricta y validada por el linter** — más rigurosa que el API
> en cuanto a la regla de dependencia. Consume el API por JWT con **repository pattern + DI + Zod en
> la frontera**. Sus riesgos principales son el **drift del contrato con el API** (validado en runtime,
> no en compilación) y el **token en localStorage**.
