# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MeguisPet is a modern pet shop management system built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4. The project is deployed to Vercel in SSR (server-side rendering) mode with Supabase as the backend for authentication and database.

**📊 For complete architecture documentation with detailed Mermaid diagrams, see [ARQUITETURA.md](./ARQUITETURA.md)**

## Development Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Start dev server with Doppler (port 3000)
pnpm dev:local        # Start dev server without Doppler (uses .env.local)

# Building
pnpm build            # Production build with Doppler (SSR)
pnpm build:local      # Production build without Doppler
pnpm build:analyze    # Build with bundle analysis (requires ANALYZE=true env)
pnpm start            # Start production server with Doppler
pnpm start:local      # Start production server without Doppler
pnpm preview          # Alias for pnpm start

# Linting
pnpm lint             # Check for linting errors
pnpm lint:fix         # Auto-fix linting issues

# Cleaning
pnpm clean            # Clean .next and cache directories
pnpm clean:build      # Clean .next build artifacts only
```

**Note**: This project uses [Doppler](https://www.doppler.com/) for environment variable management. See `DOPPLER_SETUP.md` for complete setup instructions.

## Architecture Overview

### Frontend Stack
- **Next.js 15**: Pages router with SSR (server-side rendering)
- **React 19**: Latest React with hooks and concurrent features
- **TypeScript**: Strict mode enabled
- **Tailwind CSS 4**: Utility-first styling with PostCSS (DaisyUI removed for build compatibility)
- **Shadcn/ui**: Radix UI-based component library
- **Framer Motion**: Animation library with accessibility support (respects `prefers-reduced-motion`)
- **Zustand 5**: State management with localStorage persistence

### Backend Integration
- **Supabase**: PostgreSQL database with real-time capabilities
- **Supabase Auth**: JWT authentication with automatic token refresh
- **Edge Middleware**: Route protection running on Edge runtime
- **Next.js API Routes**: Node-based API endpoints (migration from PHP in progress)
- **Legacy PHP APIs**: Some endpoints still at `/api/*.php` (being migrated)
- **Axios**: HTTP client with interceptors for token injection and dev logging

### Directory Structure

```
pages/                    # Next.js pages (file-based routing)
components/
  ├── ui/                # Shadcn/Radix base components
  ├── forms/             # Business logic forms
  ├── charts/            # Data visualization
  ├── layout/            # Header, sidebar, main layout
  └── modals/            # Modal host and modal components
hooks/                   # Custom React hooks
services/                # API service layer (clientesService, produtosService, etc.)
store/                   # Zustand stores (auth, theme, sidebar, modal)
lib/                     # Utilities (cn() for Tailwind merging)
types/                   # Global TypeScript definitions
api/                     # PHP backend endpoints
database/                # Database configuration
public/                  # Static assets
```

## Key Architectural Patterns

### 1. Global Layout System
The `MainLayout` component is automatically applied to all pages via `_app.tsx`, except for pages in the `noLayoutPages` array (e.g., `/login`). No need to wrap pages individually.

### 2. Authentication Flow (Supabase Auth)
- **Edge Middleware**: `middleware.ts` runs on Edge runtime, protects all routes except `/login` and static files
- **Cookie Management**: Uses `@supabase/ssr` package's `createServerClient` for secure cookie handling
- **Session Refresh**: Automatic token refresh via `supabase.auth.getSession()` in middleware
- **Redirects**: Unauthenticated users → `/login`, authenticated users on `/login` → `/dashboard`
- **Store**: `store/auth.ts` (Zustand with localStorage persistence for client-side state)
- **Hook**: `hooks/useAuth.ts` provides `login()`, `logout()`, `checkAuth()`
- **Client Protection**: MainLayout double-checks auth status on client side for defense-in-depth
- **User Profiles**: Custom `usuarios` table stores app-specific metadata (role, permissoes)
- **Security**: Token auto-refresh, secure httpOnly cookies via @supabase/ssr, MFA-ready
- **Important**: Never write logic between `createServerClient` and `supabase.auth.getUser()` in middleware

### 3. State Management (Zustand)
Four main stores with SSR-safe persistence:
- `auth.ts`: User, token, auth status
- `theme.ts`: Theme preference ('light' | 'dark' | 'system')
- `sidebar.ts`: Sidebar open/collapsed state with responsive behavior
- `modal.ts`: Centralized modal state with typed payloads

### 4. API Service Layer
- **Location**: `services/api.ts` + entity-specific services
- **Pattern**: Each entity has a service (e.g., `clientesService`, `produtosService`)
- **Interceptors**: Auto-add JWT token, dev logging
- **Types**: All responses typed with `ApiResponse<T>` or `PaginatedResponse<T>`
- **Base URL**: Configured via `NEXT_PUBLIC_API_URL` env variable

Example service structure:
```typescript
export const clientesService = {
  getAll: (page = 1, limit = 10) => api.get<PaginatedResponse<Cliente>>(...),
  getById: (id: number) => api.get<ApiResponse<Cliente>>(...),
  create: (cliente: ClienteForm) => api.post<ApiResponse<Cliente>>(...),
  update: (id: number, cliente: ClienteForm) => api.put(...),
  delete: (id: number) => api.delete(...)
}
```

### 5. Form Inheritance Pattern
- **Base Form**: `PessoaForm.tsx` handles shared pessoa (person) fields
- **Extended Forms**: `ClienteForm.tsx`, `FornecedorForm.tsx` extend PessoaForm
- **Configuration**: Props control behavior (`mode`, `allowTipoSwitch`, `enableDocumentoLookup`)
- **Validation**: Built-in CEP and CNPJ lookup services for auto-filling address/company data

### 6. Modal Host Pattern
- **Location**: `components/modals/modal-host.tsx`
- **Usage**: Single centralized modal manager using React Portal
- **Types**: Type-safe modal payloads via discriminated unions
- **Accessibility**: Focus trap, keyboard navigation (ESC to close), focus restoration
- **Control**: `useModal()` hook provides `open(modalId, data)`, `close()`, `setData()`

### 7. Responsive Sidebar
- **Desktop**: Persistent sidebar with collapse state
- **Tablet/Mobile**: Temporary overlay sidebar
- **State**: `useSidebar()` hook manages open/collapsed/device detection
- **Auto-close**: Mobile sidebar closes on route navigation
- **Keyboard**: ESC key closes overlay sidebar

## TypeScript Conventions

### Global Type Definitions
All types centralized in `types/index.ts`:
- **Entities**: `Usuario`, `Cliente`, `Produto`, `Venda`, `Estoque`, etc.
- **Form Types**: `ClienteForm`, `ProdutoForm`, `VendaForm` (matches API payloads)
- **API Types**: `ApiResponse<T>`, `PaginatedResponse<T>`
- **Dashboard Types**: `DashboardMetric`, `DashboardTopProduct`, etc.

### Path Aliases
```typescript
// tsconfig.json baseUrl and paths configured
import { cn } from '@/lib/utils'           // lib/utils.ts
import { Button } from '@/components/ui/button'  // components/ui/button.tsx
import { useAuth } from '@/hooks/useAuth'  // hooks/useAuth.ts
```

## Component Development

### UI Components (Shadcn/Radix)
Base components in `components/ui/`:
- Built on Radix UI primitives
- Styled with Tailwind CSS
- Variants via class-variance-authority (cva)
- Example: `Button` has variants: `default`, `destructive`, `outline`, `ghost`, `link`, `meguispet`

### Animated Components
- `AnimatedCard`: Framer Motion wrapper for Card with hover effects
- Respects `prefers-reduced-motion` for accessibility
- Usage: `<AnimatedCard>` or `<Card animated={false}>` to disable animation

### Form Components Pattern
```typescript
// Example: ClienteForm.tsx
interface ClienteFormProps {
  mode: 'create' | 'edit'
  initialData?: ClienteForm
  onSubmit: (data: ClienteForm) => Promise<void>
  onCancel: () => void
}

// Inherits from PessoaForm for shared fields (nome, cpf_cnpj, email, telefone, endereco)
// Adds cliente-specific fields (data_nascimento, observacoes)
```

### Toast Notifications
- **Component**: `components/ui/Toast.tsx`
- **Hook**: `useToast()` for programmatic toasts
- **Usage**: `toast({ title, description, variant: 'success' | 'error' | 'info' })`

## Important Development Notes

### Build Configuration
- `next.config.js` uses SSR mode (no `output: 'export'`) for Vercel deployment
- Build output goes to `.next/` directory
- Images are unoptimized (`images.unoptimized = true`) for performance
- Production build removes console logs via compiler option
- Supports both `getServerSideProps` and `getStaticProps`
- `outputFileTracingRoot` configured to avoid multi-lockfile warnings on Windows/OneDrive

### Environment Variables
This project uses **Doppler** for environment variable management. See `DOPPLER_SETUP.md` for complete setup instructions.

#### Quick Start with Doppler
```bash
# Install Doppler CLI (see DOPPLER_SETUP.md for OS-specific instructions)
doppler login

# Project is pre-configured! (.doppler.yaml points to 'meguispet' project)
# Just verify everything is OK:
pnpm doppler:check

# Run dev with variables automatically injected
pnpm dev
```

**Note**: The `.doppler.yaml` file is committed and pre-configured to use the `meguispet` project in `dev` environment. All developers automatically use the same Doppler project.

#### Fallback: Local .env.local (if not using Doppler)
```bash
# Supabase (authentication and database) - REQUIRED
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For server-side operations

# API URL (defaults to /api if not set)
NEXT_PUBLIC_API_URL=/api

# Legacy environment variables (if still using PHP APIs)
DB_HOST=localhost
DB_NAME=u123456_meguispet
DB_USER=u123456_admin
DB_PASSWORD=your_password
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
```

**Note**:
- Supabase env vars are required for middleware to function. Without them, all routes will fail authentication.
- Use `pnpm dev:local` to run without Doppler (uses `.env.local` instead).
- See `.env.example` for a template of required variables.

### Edge Runtime Constraints (Middleware)
The `middleware.ts` file runs on Edge runtime, which has limitations:
- **No Node.js APIs**: Cannot use `fs`, `path`, `crypto` (Node.js version), etc.
- **No dynamic require**: Use ESM imports only
- **Lightweight only**: Keep middleware code minimal for cold start performance
- **Cookie handling**: Must use the exact pattern from `@supabase/ssr` docs
- **Response handling**: Always return the `supabaseResponse` object to preserve cookies
- **Matcher config**: Define in `config.matcher` to avoid running on static files

### SSR-Safe Patterns
- All localStorage access wrapped in `typeof window !== 'undefined'` checks
- Zustand stores use SSR-safe storage detection
- Theme and auth hooks check `mounted` state before DOM manipulation
- Layout uses `useEffect` for hydration-safe rendering

### Styling Guidelines
- **Tailwind 4** utility classes (no DaisyUI)
- **CSS Variables** for theming (see `styles/globals.css`)
- **Dark Mode**: System preference detection with manual override
- **Custom Classes**: `meguispet-gradient`, `meguispet-card`, `meguispet-sidebar`
- **Merge Conflicts**: Use `cn()` from `lib/utils.ts` to safely merge Tailwind classes

### Performance Considerations
- Framer Motion animations use `initial`, `animate`, `exit` props
- Lazy loading via `next/dynamic` for heavy components
- Memoization with `useMemo` / `useCallback` for expensive computations
- Portal-based modals prevent layout shifts

## Testing New Features

### Adding a New Entity
1. Define types in `types/index.ts` (Entity + EntityForm interfaces)
2. Create service in `services/` (e.g., `services/entidadeService.ts`)
3. Create form component in `components/forms/` (e.g., `EntidadeForm.tsx`)
4. Create page in `pages/` (e.g., `pages/entidades.tsx`)
5. Add menu item in `components/layout/sidebar.tsx`
6. Implement PHP API endpoint in `api/entidades.php`

### Adding a New Modal
1. Add modal type to `types/index.ts` `ModalId` union
2. Add modal data type to `ModalData` discriminated union
3. Update `modal-host.tsx` to handle new modal type
4. Use `useModal()` hook to open: `open('new-modal-id', { data })`

### Adding a New API Endpoint
1. Create service function in appropriate service file
2. Type the response with `ApiResponse<T>` or `PaginatedResponse<T>`
3. Create corresponding PHP endpoint in `api/` directory
4. Test with dev proxy enabled (`pnpm dev`)

## Common Gotchas

- **Middleware Execution**: Runs on Edge runtime - avoid Node.js-specific APIs (fs, path, etc.)
- **Cookie Management**: Always return the `supabaseResponse` from middleware unchanged to preserve auth cookies
- **Token Refresh**: Handled automatically by middleware - don't manually refresh tokens
- **Image Optimization**: Disabled (`images.unoptimized = true`) - use `<img>` or `<Image unoptimized />`
- **Modal State**: Always close modals after successful operations to prevent stale data
- **Form Reset**: Reset form state after create/edit operations
- **Sidebar State**: Desktop collapse state persists, mobile state resets on close
- **Theme Flash**: Theme hook waits for `mounted` state to prevent SSR/client mismatch
- **Console Logs**: Automatically removed in production builds

## Performance Optimizations

The system includes several performance optimizations for fast page loading:
- **Parallel API Loading**: Dashboard loads all data simultaneously (~70% faster)
- **Server-Side Caching**: 5-minute cache for expensive queries (~90% less DB load)
- **Database Indexes**: Composite indexes for common queries (~50-80% faster)
- **Query Optimization**: Parallel database queries and result limiting
- **Build Optimizations**: Webpack parallel builds, CSS optimization, module caching

For detailed information, see `PERFORMANCE_GUIDE.md` (if available) or `database/performance_indexes.sql`.

## Deployment

### Vercel (Production)
The project is deployed to Vercel with the following configuration:
1. Push to `master` branch triggers automatic deployment
2. Vercel automatically detects Next.js and runs `pnpm build`
3. Build output (`.next/` directory) is deployed with SSR enabled
4. Edge middleware runs automatically on Vercel Edge Network for route protection
5. Production URL: `https://gestao.meguispet.com`

### Environment Variables Required in Vercel
Configure these in the Vercel dashboard (Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for server-side operations)
- `NEXT_PUBLIC_API_URL`: API base URL (defaults to `/api` if not set)

### Local Development
For local development, create a `.env.local` file with the same variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=/api
```

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
