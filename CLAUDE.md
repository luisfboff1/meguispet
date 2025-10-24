# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MeguisPet is a modern pet shop management system built with Next.js 15, React 19, TypeScript, and Tailwind CSS 4. The frontend is statically exported and deployed to Hostinger alongside a PHP/MariaDB backend.

## Development Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm dev              # Start dev server with API proxy to PHP backend

# Building
pnpm build            # Production build (SSG + copies PHP API)
pnpm build:analyze    # Build with bundle analysis
pnpm preview          # Serve static build locally

# Linting
pnpm lint             # Check for linting errors
pnpm lint:fix         # Auto-fix linting issues

# Cleaning
pnpm clean            # Full clean (removes node_modules/.cache too)
pnpm clean:build      # Clean build artifacts only (.next, out, dist)
```

## Architecture Overview

### Frontend Stack
- **Next.js 15**: Pages router with static export (`output: 'export'`)
- **React 19**: Latest React with hooks and concurrent features
- **TypeScript**: Strict mode enabled
- **Tailwind CSS 4**: Utility-first styling with PostCSS
- **Shadcn/ui**: Radix UI-based component library
- **Framer Motion**: Animation library with accessibility support
- **Zustand 5**: State management with persistence

### Backend Integration
- **PHP APIs**: RESTful endpoints at `/api/*.php`
- **MariaDB**: Database backend
- **JWT Authentication**: Token-based auth with Bearer tokens
- **Axios**: HTTP client with interceptors for auth

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

### 2. Authentication Flow
- **Store**: `store/auth.ts` (Zustand with localStorage persistence)
- **Hook**: `hooks/useAuth.ts` provides `login()`, `logout()`, `checkAuth()`
- **Auth Method**: Supabase Auth with JWT tokens (access + refresh tokens)
- **Session Storage**: Supabase session in localStorage (automatic token refresh)
- **Protection**: MainLayout checks auth status and redirects to `/login` if unauthenticated
- **API Integration**: Request interceptor auto-adds `Authorization: Bearer {token}` header
- **Middleware**: API routes protected with `withSupabaseAuth` from `lib/supabase-middleware.ts`
- **User Profiles**: Custom `usuarios` table stores app-specific metadata (role, permissoes)
- **Security**: No hardcoded secrets, 1-hour token expiry with automatic refresh, MFA-ready

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

### Static Export Configuration
- `next.config.js` has `output: 'export'` for static HTML generation
- Build output goes to `dist/` directory
- Images are unoptimized (`images.unoptimized = true`)
- No `getServerSideProps` support (use `getStaticProps` or client-side fetch)
- Each route generates `.html` + `.json` files in `dist/_next/data/<buildId>/`

### Environment Variables
Required in `.env.local`:
```bash
# Supabase (authentication and database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (legacy, migrating to Supabase)
DB_HOST=localhost
DB_NAME=u123456_meguispet
DB_USER=u123456_admin
DB_PASSWORD=your_password

# API URL (for static export)
NEXT_PUBLIC_API_URL=/api

# SMTP (for notifications)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password
```

### Development Proxy
`next.config.js` includes dev rewrites to proxy `/api/*` requests to local PHP backend during development.

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

- **API URL**: In production, `NEXT_PUBLIC_API_URL=/api` routes to same domain. In dev, proxied to PHP backend.
- **Trailing Slashes**: Next.js config has `trailingSlash: true` for Hostinger compatibility
- **Image Optimization**: Disabled for static export - use `<img>` or `<Image unoptimized />`
- **Token Expiry**: JWT tokens expire after 7 days - `checkAuth()` validates on app load
- **Modal State**: Always close modals after successful operations to prevent stale data
- **Form Reset**: Reset form state after create/edit operations
- **Sidebar State**: Desktop collapse state persists, mobile state resets on close
- **Theme Flash**: Theme hook waits for `mounted` state to prevent SSR/client mismatch

## Deployment

The project uses GitHub Actions for automated deployment to Hostinger:
1. Build static export (`pnpm build`)
2. Copy PHP API files
3. FTP upload to Hostinger
4. Configure secrets in GitHub repo settings (FTP credentials, env vars)

Production URLs:
- Frontend: `https://gestao.meguispet.com`
- API: `https://gestao.meguispet.com/api`
