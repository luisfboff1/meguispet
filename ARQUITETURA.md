# 🏗️ Arquitetura do Sistema MeguisPet

> **Documentação completa da arquitetura do projeto em Mermaid**  
> Sistema de gestão profissional para pet shop com Next.js 15 + TypeScript + Supabase

## 📋 Índice

1. [Arquitetura Geral do Sistema](#1-arquitetura-geral-do-sistema)
2. [Arquitetura Frontend](#2-arquitetura-frontend)
3. [Arquitetura Backend](#3-arquitetura-backend)
4. [Banco de Dados](#4-banco-de-dados)
5. [Fluxo de Autenticação](#5-fluxo-de-autenticação)
6. [APIs e Endpoints](#6-apis-e-endpoints)
7. [Gerenciamento de Estado](#7-gerenciamento-de-estado)
8. [Hierarquia de Componentes](#8-hierarquia-de-componentes)
9. [Fluxos de Dados](#9-fluxos-de-dados)
10. [Stack Tecnológica](#10-stack-tecnológica)

---

## 1. Arquitetura Geral do Sistema

### Visão de Alto Nível

```mermaid
graph TB
    subgraph "Cliente/Browser"
        A[React 19 UI]
        B[Framer Motion]
        C[Shadcn/ui Components]
    end
    
    subgraph "Frontend Layer"
        D[Next.js 15 Pages Router]
        E[TypeScript]
        F[Tailwind CSS 4]
    end
    
    subgraph "Middleware Layer"
        G[Edge Middleware]
        H[Supabase Auth]
        I[Route Protection]
    end
    
    subgraph "Backend Layer"
        J[Next.js API Routes]
        K[Services Layer]
        L[Business Logic]
    end
    
    subgraph "Data Layer"
        M[Supabase PostgreSQL]
        N[Real-time Subscriptions]
        O[Storage]
    end
    
    subgraph "External Services"
        P[Doppler - Env Vars]
        Q[Vercel Edge Network]
        R[CEP/CNPJ APIs]
    end
    
    A --> D
    B --> D
    C --> D
    D --> G
    E --> D
    F --> D
    G --> H
    G --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    M --> O
    P --> J
    Q --> G
    K --> R

    style A fill:#e1f5ff
    style D fill:#bbdefb
    style G fill:#fff9c4
    style J fill:#c8e6c9
    style M fill:#f8bbd0
    style P fill:#ffccbc
```

### Deployment Architecture

```mermaid
graph LR
    subgraph "Development"
        A[Local Development<br/>pnpm dev]
        B[Doppler CLI<br/>Env Vars]
    end
    
    subgraph "Version Control"
        C[GitHub Repository]
        D[Git Push]
    end
    
    subgraph "Vercel Platform"
        E[Build Pipeline]
        F[Next.js Build]
        G[Edge Network]
        H[SSR Rendering]
        I[Static Assets CDN]
    end
    
    subgraph "Production"
        J[gestao.meguispet.com]
        K[Edge Middleware]
        L[API Routes]
    end
    
    subgraph "Database"
        M[Supabase Cloud]
        N[PostgreSQL]
        O[Auth Service]
    end
    
    A --> D
    B --> A
    D --> C
    C --> E
    E --> F
    F --> G
    G --> H
    G --> I
    H --> J
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    M --> O

    style A fill:#e8f5e9
    style C fill:#fff3e0
    style E fill:#e1f5fe
    style J fill:#f3e5f5
    style M fill:#fce4ec
```

---

## 2. Arquitetura Frontend

### Estrutura de Páginas e Rotas

```mermaid
graph TD
    A[App _app.tsx] --> B{Layout System}
    B --> C[MainLayout]
    B --> D[No Layout Pages]
    
    C --> E[Dashboard]
    C --> F[Vendas]
    C --> G[Produtos]
    C --> H[Estoque]
    C --> I[Clientes]
    C --> J[Fornecedores]
    C --> K[Financeiro]
    C --> L[Relatórios]
    C --> M[Usuários]
    C --> N[Vendedores]
    C --> O[Configurações]
    
    D --> P[Login]
    
    E --> Q[Dashboard API]
    F --> R[Vendas API]
    G --> S[Produtos API]
    H --> T[Estoque API]
    I --> U[Clientes API]
    J --> V[Fornecedores API]
    K --> W[Transações API]
    L --> X[Relatórios API]

    style A fill:#e3f2fd
    style C fill:#c5cae9
    style D fill:#ffccbc
    style P fill:#ffccbc
```

### Component Architecture

```mermaid
graph TB
    subgraph "UI Components (Shadcn/Radix)"
        A[Button]
        B[Card]
        C[Dialog]
        D[Input]
        E[Select]
        F[Table]
        G[Toast]
        H[Tabs]
    end
    
    subgraph "Layout Components"
        I[Header]
        J[Sidebar]
        K[MainLayout]
        L[Footer]
    end
    
    subgraph "Form Components"
        M[ProdutoForm]
        N[VendaForm]
        O[ClienteForm]
        P[FornecedorForm]
        Q[PessoaForm Base]
        R[TransacaoForm]
    end
    
    subgraph "Business Components"
        S[VendaDetalhes]
        T[EstoqueRelatorio]
        U[DashboardMetrics]
        V[ProductCard]
        W[ClienteCard]
        X[MovimentacaoForm]
    end
    
    subgraph "Modal System"
        Y[ModalHost]
        Z[Modal Types]
    end
    
    K --> I
    K --> J
    K --> L
    
    M --> Q
    N --> Q
    O --> Q
    P --> Q
    
    M --> A
    M --> D
    M --> E
    N --> F
    N --> C
    
    Y --> Z
    Z --> M
    Z --> N
    Z --> O

    style A fill:#e1f5fe
    style K fill:#fff9c4
    style M fill:#c8e6c9
    style S fill:#f8bbd0
    style Y fill:#ffccbc
```

### Hooks Architecture

```mermaid
graph LR
    A[useAuth] --> B[Auth Store]
    C[useTheme] --> D[Theme Store]
    E[useSidebar] --> F[Sidebar Store]
    G[useModal] --> H[Modal Store]
    
    B --> I[Supabase Auth]
    C --> J[localStorage]
    E --> K[localStorage]
    G --> L[React State]
    
    I --> M[Edge Middleware]
    
    style A fill:#bbdefb
    style C fill:#c5cae9
    style E fill:#b2dfdb
    style G fill:#ffccbc
    style I fill:#f8bbd0
```

---

## 3. Arquitetura Backend

### API Routes Structure

```mermaid
graph TB
    subgraph "API Layer"
        A[/api/auth]
        B[/api/produtos]
        C[/api/vendas]
        D[/api/clientes]
        E[/api/fornecedores]
        F[/api/estoque]
        G[/api/dashboard]
        H[/api/transacoes]
        I[/api/relatorios]
        J[/api/usuarios]
        K[/api/vendedores]
        L[/api/movimentacoes]
    end
    
    subgraph "Services Layer"
        M[api.ts - Axios Client]
        N[clientesService]
        O[produtosService]
        P[vendasService]
        Q[impostosService]
        R[reportsService]
        S[feedbackService]
    end
    
    subgraph "Database Layer"
        T[Supabase Client]
        U[PostgreSQL]
    end
    
    A --> M
    B --> M
    C --> M
    D --> M
    E --> M
    F --> M
    G --> M
    H --> M
    I --> M
    J --> M
    K --> M
    L --> M
    
    M --> N
    M --> O
    M --> P
    M --> Q
    M --> R
    M --> S
    
    N --> T
    O --> T
    P --> T
    Q --> T
    R --> T
    S --> T
    
    T --> U

    style A fill:#e3f2fd
    style M fill:#fff9c4
    style T fill:#f8bbd0
```

### Service Layer Pattern

```mermaid
graph LR
    subgraph "Frontend Component"
        A[React Component]
    end
    
    subgraph "Service Layer"
        B[Entity Service]
        C[API Client]
        D[Interceptors]
    end
    
    subgraph "API Routes"
        E[Next.js API Route]
        F[Validation]
        G[Business Logic]
    end
    
    subgraph "Database"
        H[Supabase]
        I[PostgreSQL]
    end
    
    A -->|Call Service| B
    B -->|HTTP Request| C
    C -->|Add JWT Token| D
    D -->|Forward| E
    E -->|Validate| F
    F -->|Execute| G
    G -->|Query| H
    H -->|Data| I
    I -->|Response| H
    H -->|Response| G
    G -->|Response| E
    E -->|Response| D
    D -->|Response| C
    C -->|Response| B
    B -->|Update State| A

    style B fill:#c8e6c9
    style E fill:#fff9c4
    style H fill:#f8bbd0
```

### Middleware Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Edge Middleware
    participant Supabase Auth
    participant Protected Route
    participant Login Page
    
    Browser->>Edge Middleware: Request /dashboard
    Edge Middleware->>Supabase Auth: Get Session
    Supabase Auth->>Supabase Auth: Refresh Token if Needed
    Supabase Auth->>Edge Middleware: Return User/Session
    
    alt User Authenticated
        Edge Middleware->>Protected Route: Allow Access
        Protected Route->>Browser: Render Page
    else User Not Authenticated
        Edge Middleware->>Login Page: Redirect to /login
        Login Page->>Browser: Show Login Form
    end
    
    Browser->>Login Page: Submit Credentials
    Login Page->>Supabase Auth: Authenticate
    Supabase Auth->>Login Page: Return Session
    Login Page->>Browser: Redirect to /dashboard
```

---

## 4. Banco de Dados

### Database Schema (ERD)

```mermaid
erDiagram
    usuarios ||--o{ vendedores : manages
    usuarios {
        bigint id PK
        string nome
        string email UK
        string password_hash
        string role
        text permissoes
        boolean ativo
        uuid supabase_user_id
        timestamp created_at
        timestamp updated_at
    }
    
    vendedores ||--o{ clientes_fornecedores : serves
    vendedores ||--o{ vendas : makes
    vendedores {
        bigint id PK
        string nome
        string email
        string telefone
        numeric comissao
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    clientes_fornecedores ||--o{ vendas : places
    clientes_fornecedores ||--o{ movimentacoes_estoque : supplies
    clientes_fornecedores {
        bigint id PK
        string nome
        string tipo
        string email
        string telefone
        text endereco
        string cidade
        string estado
        string cep
        string documento
        text observacoes
        bigint vendedor_id FK
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    fornecedores ||--o{ movimentacoes_estoque : supplies
    fornecedores {
        bigint id PK
        string nome
        string nome_fantasia
        string cnpj
        string inscricao_estadual
        string email
        string telefone
        text endereco
        string cidade
        string estado
        string cep
        text observacoes
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    produtos ||--o{ produtos_estoques : stored_in
    produtos ||--o{ vendas_itens : sold_in
    produtos ||--o{ movimentacoes_itens : moved_in
    produtos ||--o{ historico_precos : has_history
    produtos {
        bigint id PK
        string nome
        text descricao
        numeric preco_venda
        numeric preco_custo
        int estoque
        int estoque_minimo
        string categoria
        string codigo_barras
        numeric ipi
        numeric icms
        numeric st
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    estoques ||--o{ produtos_estoques : contains
    estoques {
        bigint id PK
        string nome UK
        string descricao
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    produtos_estoques {
        bigint id PK
        bigint produto_id FK
        bigint estoque_id FK
        int quantidade
        timestamp created_at
        timestamp updated_at
    }
    
    vendas ||--o{ vendas_itens : contains
    vendas ||--o{ venda_parcelas : has_installments
    vendas {
        bigint id PK
        string numero_venda UK
        bigint cliente_id FK
        bigint vendedor_id FK
        bigint forma_pagamento_id FK
        numeric valor_total
        numeric desconto
        numeric valor_liquido
        string status
        date data_venda
        text observacoes
        timestamp created_at
        timestamp updated_at
    }
    
    vendas_itens {
        bigint id PK
        bigint venda_id FK
        bigint produto_id FK
        int quantidade
        numeric preco_unitario
        numeric subtotal
        numeric desconto_item
        timestamp created_at
    }
    
    venda_parcelas {
        bigint id PK
        bigint venda_id FK
        int numero_parcela
        numeric valor
        date data_vencimento
        date data_pagamento
        string status
        timestamp created_at
        timestamp updated_at
    }
    
    formas_pagamento ||--o{ vendas : used_in
    formas_pagamento {
        bigint id PK
        string nome UK
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    movimentacoes_estoque ||--o{ movimentacoes_itens : contains
    movimentacoes_estoque {
        bigint id PK
        string tipo
        bigint fornecedor_id FK
        date data
        string status
        text observacoes
        timestamp created_at
        timestamp updated_at
    }
    
    movimentacoes_itens {
        bigint id PK
        bigint movimentacao_id FK
        bigint produto_id FK
        int quantidade
        numeric preco
        timestamp created_at
    }
    
    historico_precos {
        bigint id PK
        bigint produto_id FK
        numeric preco_venda_anterior
        numeric preco_venda_novo
        numeric preco_custo_anterior
        numeric preco_custo_novo
        timestamp data_alteracao
    }
    
    transacoes {
        bigint id PK
        string tipo
        string categoria
        numeric valor
        date data
        text descricao
        string forma_pagamento
        boolean recorrente
        timestamp created_at
        timestamp updated_at
    }
    
    categorias_financeiras {
        bigint id PK
        string nome UK
        string tipo
        text descricao
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    transacoes_recorrentes {
        bigint id PK
        bigint categoria_id FK
        string tipo
        numeric valor
        string frequencia
        date proxima_data
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    
    feedback_system {
        bigint id PK
        bigint usuario_id FK
        string tipo
        string titulo
        text descricao
        string prioridade
        string status
        timestamp created_at
        timestamp updated_at
    }
    
    relatorios_salvos {
        bigint id PK
        bigint usuario_id FK
        string nome
        string tipo
        json parametros
        date data_geracao
        timestamp created_at
        timestamp updated_at
    }
```

### Database Relationships

```mermaid
graph TB
    subgraph "Core Entities"
        A[usuarios]
        B[vendedores]
        C[clientes_fornecedores]
        D[fornecedores]
        E[produtos]
    end
    
    subgraph "Stock Management"
        F[estoques]
        G[produtos_estoques]
        H[movimentacoes_estoque]
        I[movimentacoes_itens]
    end
    
    subgraph "Sales Management"
        J[vendas]
        K[vendas_itens]
        L[venda_parcelas]
        M[formas_pagamento]
    end
    
    subgraph "Auxiliary Tables"
        N[historico_precos]
        O[transacoes]
        P[categorias_financeiras]
        Q[feedback_system]
        R[relatorios_salvos]
    end
    
    A -->|manages| B
    B -->|serves| C
    B -->|makes| J
    C -->|places| J
    D -->|supplies| H
    
    E -->|stored_in| G
    F -->|contains| G
    E -->|moved_in| I
    H -->|contains| I
    
    E -->|sold_in| K
    J -->|contains| K
    J -->|has_installments| L
    M -->|used_in| J
    
    E -->|has_history| N
    A -->|creates| Q
    A -->|generates| R

    style A fill:#e3f2fd
    style E fill:#fff9c4
    style F fill:#c8e6c9
    style J fill:#f8bbd0
    style N fill:#ffccbc
```

---

## 5. Fluxo de Autenticação

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant LoginPage
    participant Supabase Auth
    participant Edge Middleware
    participant Dashboard
    participant Zustand Store
    
    User->>LoginPage: Enter credentials
    LoginPage->>Supabase Auth: signInWithPassword()
    Supabase Auth->>Supabase Auth: Validate credentials
    
    alt Valid Credentials
        Supabase Auth->>LoginPage: Return session + JWT
        LoginPage->>Zustand Store: Save user + token
        Zustand Store->>localStorage: Persist auth state
        LoginPage->>User: Redirect to /dashboard
        
        User->>Edge Middleware: Navigate to /dashboard
        Edge Middleware->>Supabase Auth: Validate JWT token
        Supabase Auth->>Edge Middleware: Token valid
        Edge Middleware->>Dashboard: Allow access
        Dashboard->>User: Render dashboard
    else Invalid Credentials
        Supabase Auth->>LoginPage: Return error
        LoginPage->>User: Show error message
    end
```

### Token Refresh Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Edge Middleware
    participant Supabase Auth
    participant API Route
    
    Browser->>Edge Middleware: Request with expired token
    Edge Middleware->>Supabase Auth: getSession()
    Supabase Auth->>Supabase Auth: Check token expiry
    
    alt Token Expired
        Supabase Auth->>Supabase Auth: Refresh with refresh_token
        Supabase Auth->>Edge Middleware: Return new session
        Edge Middleware->>Browser: Set new cookies
        Edge Middleware->>API Route: Forward request
        API Route->>Browser: Return response
    else Token Invalid
        Supabase Auth->>Edge Middleware: Authentication failed
        Edge Middleware->>Browser: Redirect to /login
    end
```

### Authorization Hierarchy

```mermaid
graph TD
    A[User Authentication] --> B{Role Check}
    B -->|admin| C[Full Access]
    B -->|user| D[Limited Access]
    B -->|convidado| E[Read-Only Access]
    
    C --> F[All CRUD Operations]
    C --> G[User Management]
    C --> H[System Configuration]
    C --> I[Reports Generation]
    C --> J[Financial Data]
    
    D --> K[Own Data CRUD]
    D --> L[View Reports]
    D --> M[Basic Operations]
    
    E --> N[View Only]
    E --> O[No Modifications]

    style A fill:#e3f2fd
    style C fill:#c8e6c9
    style D fill:#fff9c4
    style E fill:#ffccbc
```

---

## 6. APIs e Endpoints

### API Endpoints Overview

```mermaid
graph TB
    subgraph "Public APIs"
        A[/api/auth/login]
        B[/api/auth/register]
        C[/api/health]
    end
    
    subgraph "Protected APIs - Core"
        D[/api/produtos]
        E[/api/vendas]
        F[/api/clientes]
        G[/api/fornecedores]
        H[/api/estoque]
    end
    
    subgraph "Protected APIs - Management"
        I[/api/usuarios]
        J[/api/vendedores]
        K[/api/movimentacoes]
        L[/api/transacoes]
    end
    
    subgraph "Protected APIs - Reports"
        M[/api/dashboard/metrics]
        N[/api/dashboard/top-products]
        O[/api/relatorios/vendas]
        P[/api/relatorios/estoque]
        Q[/api/relatorios/financeiro]
    end
    
    subgraph "Utility APIs"
        R[/api/cep]
        S[/api/cnpj]
        T[/api/historico-precos]
        U[/api/feedback]
    end

    style A fill:#c8e6c9
    style D fill:#bbdefb
    style I fill:#fff9c4
    style M fill:#f8bbd0
    style R fill:#ffccbc
```

### API Request/Response Flow

```mermaid
sequenceDiagram
    participant Component
    participant Service
    participant Axios
    participant Interceptor
    participant API Route
    participant Database
    
    Component->>Service: Call service method
    Service->>Axios: HTTP request
    Axios->>Interceptor: Before request
    Interceptor->>Interceptor: Add JWT token
    Interceptor->>API Route: Forward request
    
    API Route->>API Route: Validate JWT
    API Route->>API Route: Validate input
    API Route->>Database: Execute query
    Database->>API Route: Return data
    
    API Route->>API Route: Format response
    API Route->>Interceptor: Send response
    Interceptor->>Interceptor: Log in dev mode
    Interceptor->>Axios: Forward response
    Axios->>Service: Return data
    Service->>Component: Update state
```

### CRUD Operations Pattern

```mermaid
graph TB
    subgraph "CRUD Pattern"
        A[GET /api/entity] -->|List/Paginated| B[Response]
        C[GET /api/entity/:id] -->|Single Record| D[Response]
        E[POST /api/entity] -->|Create| F[Response]
        G[PUT /api/entity/:id] -->|Update| H[Response]
        I[DELETE /api/entity/:id] -->|Delete| J[Response]
    end
    
    subgraph "Common Features"
        K[Pagination]
        L[Sorting]
        M[Filtering]
        N[Search]
    end
    
    subgraph "Response Format"
        O[success: boolean]
        P[data: T or T array]
        Q[message: string]
        R[error: string]
    end
    
    A --> K
    A --> L
    A --> M
    A --> N
    
    B --> O
    B --> P
    B --> Q
    B --> R

    style A fill:#bbdefb
    style E fill:#c8e6c9
    style G fill:#fff9c4
    style I fill:#ffccbc
```

---

## 7. Gerenciamento de Estado

### Zustand Stores Architecture

```mermaid
graph TB
    subgraph "Auth Store"
        A[auth.ts]
        A1[user: Usuario]
        A2[token: string]
        A3[isAuthenticated: boolean]
        A4[login function]
        A5[logout function]
        A6[checkAuth function]
    end
    
    subgraph "Theme Store"
        B[theme.ts]
        B1[theme: light/dark/system]
        B2[setTheme function]
        B3[toggleTheme function]
    end
    
    subgraph "Sidebar Store"
        C[sidebar.ts]
        C1[isOpen: boolean]
        C2[isCollapsed: boolean]
        C3[isMobile: boolean]
        C4[toggle function]
        C5[collapse function]
        C6[open/close functions]
    end
    
    subgraph "Modal Store"
        D[modal.ts]
        D1[isOpen: boolean]
        D2[modalId: string]
        D3[modalData: any]
        D4[open function]
        D5[close function]
        D6[setData function]
    end
    
    subgraph "Persistence"
        E[localStorage]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    A --> A5
    A --> A6
    A1 --> E
    A2 --> E
    A3 --> E
    
    B --> B1
    B --> B2
    B --> B3
    B1 --> E
    
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    C --> C5
    C --> C6
    C1 --> E
    C2 --> E
    
    D --> D1
    D --> D2
    D --> D3
    D --> D4
    D --> D5
    D --> D6

    style A fill:#e3f2fd
    style B fill:#fff9c4
    style C fill:#c8e6c9
    style D fill:#f8bbd0
    style E fill:#ffccbc
```

### State Management Flow

```mermaid
sequenceDiagram
    participant Component
    participant useAuth Hook
    participant Auth Store
    participant localStorage
    participant Supabase
    
    Component->>useAuth Hook: Call login(email, password)
    useAuth Hook->>Supabase: signInWithPassword()
    Supabase->>useAuth Hook: Return session + user
    useAuth Hook->>Auth Store: Set user + token
    Auth Store->>localStorage: Persist auth state
    Auth Store->>Component: Update state
    Component->>Component: Re-render with user data
```

---

## 8. Hierarquia de Componentes

### Main Layout Hierarchy

```mermaid
graph TB
    A[_app.tsx] --> B[MainLayout]
    B --> C[Header]
    B --> D[Sidebar]
    B --> E[Main Content]
    B --> F[ModalHost]
    
    C --> C1[Logo]
    C --> C2[Search Bar]
    C --> C3[Theme Toggle]
    C --> C4[User Menu]
    
    D --> D1[Navigation Menu]
    D --> D2[Active Route Indicator]
    D --> D3[Collapse Toggle]
    
    E --> E1[Page Component]
    E1 --> E2[Dashboard]
    E1 --> E3[Vendas]
    E1 --> E4[Produtos]
    E1 --> E5[Clientes]
    
    F --> F1[Modal Content]
    F1 --> F2[Forms]
    F1 --> F3[Confirmations]
    F1 --> F4[Details]

    style A fill:#e3f2fd
    style B fill:#bbdefb
    style C fill:#c8e6c9
    style D fill:#fff9c4
    style E fill:#f8bbd0
    style F fill:#ffccbc
```

### Form Components Inheritance

```mermaid
graph TB
    A[PessoaForm Base] --> B[ClienteForm]
    A --> C[FornecedorForm]
    
    subgraph "PessoaForm - Shared Fields"
        A1[nome]
        A2[email]
        A3[telefone]
        A4[documento CPF/CNPJ]
        A5[endereco]
        A6[cidade/estado/cep]
    end
    
    subgraph "ClienteForm - Specific"
        B1[vendedor_id]
        B2[tipo: cliente]
        B3[observacoes]
    end
    
    subgraph "FornecedorForm - Specific"
        C1[nome_fantasia]
        C2[inscricao_estadual]
        C3[tipo: fornecedor]
    end
    
    A --> A1
    A --> A2
    A --> A3
    A --> A4
    A --> A5
    A --> A6
    
    B --> B1
    B --> B2
    B --> B3
    
    C --> C1
    C --> C2
    C --> C3

    style A fill:#fff9c4
    style B fill:#c8e6c9
    style C fill:#bbdefb
```

### Component Communication

```mermaid
graph LR
    subgraph "Parent Component"
        A[ProductsPage]
    end
    
    subgraph "Child Components"
        B[ProductList]
        C[ProductCard]
        D[ProductForm Modal]
    end
    
    subgraph "Shared State"
        E[Products Array]
        F[Selected Product]
        G[Loading State]
    end
    
    subgraph "Actions"
        H[Create Product]
        I[Update Product]
        J[Delete Product]
        K[Load Products]
    end
    
    A -->|Props| B
    B -->|Props| C
    A -->|Modal State| D
    
    A --> E
    A --> F
    A --> G
    
    D --> H
    D --> I
    C --> J
    A --> K
    
    H -->|Callback| A
    I -->|Callback| A
    J -->|Callback| A
    K -->|Update| E

    style A fill:#e3f2fd
    style B fill:#bbdefb
    style D fill:#f8bbd0
    style E fill:#c8e6c9
```

---

## 9. Fluxos de Dados

### Fluxo de Venda (Sales Flow)

```mermaid
sequenceDiagram
    participant User
    participant VendaForm
    participant Service
    participant API
    participant Database
    participant Stock
    
    User->>VendaForm: Select products
    VendaForm->>VendaForm: Calculate subtotals
    User->>VendaForm: Submit sale
    VendaForm->>Service: createVenda(data)
    Service->>API: POST /api/vendas
    
    API->>Database: Begin transaction
    API->>Database: Insert venda
    API->>Database: Insert vendas_itens
    
    loop For each item
        API->>Stock: Update product stock
        API->>Database: Decrease estoque
    end
    
    API->>Database: Commit transaction
    Database->>API: Success response
    API->>Service: Return created venda
    Service->>VendaForm: Success
    VendaForm->>User: Show success message
```

### Fluxo de Movimentação de Estoque

```mermaid
sequenceDiagram
    participant User
    participant MovimentacaoForm
    participant Service
    participant API
    participant Database
    participant Triggers
    
    User->>MovimentacaoForm: Select type (entrada/saída/ajuste)
    User->>MovimentacaoForm: Add products
    MovimentacaoForm->>MovimentacaoForm: Calculate totals
    User->>MovimentacaoForm: Submit
    
    MovimentacaoForm->>Service: createMovimentacao(data)
    Service->>API: POST /api/movimentacoes
    
    API->>Database: Begin transaction
    API->>Database: Insert movimentacao_estoque
    API->>Database: Insert movimentacoes_itens
    
    Triggers->>Database: Calculate weighted average cost
    Triggers->>Database: Update produtos.preco_custo
    Triggers->>Database: Update produtos.estoque
    Triggers->>Database: Insert historico_precos
    
    API->>Database: Commit transaction
    Database->>API: Success response
    API->>Service: Return movimentacao
    Service->>MovimentacaoForm: Success
    MovimentacaoForm->>User: Show success message
```

### Fluxo de Dashboard (Metrics Loading)

```mermaid
graph TB
    A[Dashboard Page Load] --> B{Parallel API Calls}
    
    B --> C[/api/dashboard/metrics]
    B --> D[/api/dashboard/top-products]
    B --> E[/api/vendas Recent]
    B --> F[/api/produtos Low Stock]
    
    C --> G[Total Sales]
    C --> H[Revenue]
    C --> I[Customer Count]
    C --> J[Product Count]
    
    D --> K[Top 5 Products]
    D --> L[Sales by Product]
    
    E --> M[Recent Sales List]
    
    F --> N[Low Stock Alerts]
    
    G --> O[Render Dashboard]
    H --> O
    I --> O
    J --> O
    K --> O
    L --> O
    M --> O
    N --> O
    
    O --> P[Display to User]

    style A fill:#e3f2fd
    style B fill:#fff9c4
    style C fill:#c8e6c9
    style D fill:#c8e6c9
    style E fill:#c8e6c9
    style F fill:#c8e6c9
    style O fill:#f8bbd0
```

### Fluxo de Relatórios

```mermaid
graph TB
    subgraph "Report Generation"
        A[User Selects Report Type]
        B[Set Filters/Date Range]
        C[Click Generate]
    end
    
    subgraph "API Processing"
        D[/api/relatorios/:type]
        E[Validate Parameters]
        F[Execute Complex Query]
        G[Aggregate Data]
        H[Format Response]
    end
    
    subgraph "Data Presentation"
        I[Charts/Graphs]
        J[Tables]
        K[Export Options]
        L[PDF/Excel]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    K --> L

    style A fill:#e3f2fd
    style D fill:#fff9c4
    style I fill:#c8e6c9
```

---

## 10. Stack Tecnológica

### Technology Stack

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React 19]
        B[Next.js 15 Pages Router]
        C[TypeScript 5]
        D[Tailwind CSS 4]
        E[Shadcn/ui]
        F[Framer Motion]
    end
    
    subgraph "State Management"
        G[Zustand 5]
        H[localStorage]
        I[React Context]
    end
    
    subgraph "Backend Layer"
        J[Next.js API Routes]
        K[Node.js 20]
        L[Edge Runtime]
    end
    
    subgraph "Database"
        M[Supabase]
        N[PostgreSQL 15]
        O[Real-time]
        P[Storage]
    end
    
    subgraph "Authentication"
        Q[Supabase Auth]
        R[JWT Tokens]
        S[Edge Middleware]
    end
    
    subgraph "DevOps"
        T[Vercel]
        U[GitHub]
        V[Doppler]
        W[pnpm]
    end
    
    subgraph "External APIs"
        X[CEP API]
        Y[CNPJ API]
    end

    style A fill:#61dafb
    style B fill:#000000
    style C fill:#3178c6
    style D fill:#38bdf8
    style M fill:#3ecf8e
    style T fill:#000000
```

### Development Tools

```mermaid
graph LR
    subgraph "Development"
        A[VS Code]
        B[ESLint]
        C[Prettier]
        D[TypeScript]
    end
    
    subgraph "Build Tools"
        E[Next.js Compiler]
        F[Webpack 5]
        G[PostCSS]
        H[SWC]
    end
    
    subgraph "Version Control"
        I[Git]
        J[GitHub]
        K[GitHub Actions]
    end
    
    subgraph "Package Management"
        L[pnpm]
        M[Node.js 20]
    end
    
    A --> B
    A --> C
    A --> D
    D --> E
    E --> F
    E --> H
    F --> G
    I --> J
    J --> K
    L --> M

    style A fill:#007acc
    style E fill:#000000
    style I fill:#f05032
    style L fill:#f9ad00
```

### Environment & Deployment

```mermaid
graph TB
    subgraph "Local Development"
        A[pnpm dev]
        B[Doppler CLI]
        C[localhost:3000]
    end
    
    subgraph "Environment Variables"
        D[Doppler Cloud]
        E[.env.local fallback]
        F[Supabase Keys]
        G[API URLs]
    end
    
    subgraph "CI/CD Pipeline"
        H[GitHub Push]
        I[Vercel Build]
        J[Deploy Preview]
        K[Production Deploy]
    end
    
    subgraph "Production"
        L[Vercel Edge Network]
        M[SSR Rendering]
        N[gestao.meguispet.com]
        O[Supabase Cloud]
    end
    
    A --> B
    B --> D
    D --> F
    D --> G
    E --> F
    E --> G
    
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    M --> N
    N --> O

    style A fill:#c8e6c9
    style D fill:#ffccbc
    style I fill:#bbdefb
    style N fill:#f8bbd0
```

---

## 📊 Métricas e Performance

### Performance Optimizations

```mermaid
graph TB
    subgraph "Frontend Optimizations"
        A[Code Splitting]
        B[Lazy Loading]
        C[Image Optimization]
        D[CSS Optimization]
    end
    
    subgraph "Backend Optimizations"
        E[Server-Side Caching]
        F[Database Indexes]
        G[Query Optimization]
        H[Parallel Queries]
    end
    
    subgraph "Network Optimizations"
        I[Edge Middleware]
        J[CDN Static Assets]
        K[HTTP/2]
        L[Compression]
    end
    
    subgraph "Results"
        M[70% Faster Loading]
        N[90% Less DB Load]
        O[50-80% Faster Queries]
    end
    
    A --> M
    B --> M
    E --> N
    F --> O
    G --> O
    H --> O
    I --> M
    J --> M

    style M fill:#c8e6c9
    style N fill:#c8e6c9
    style O fill:#c8e6c9
```

---

## 🔒 Segurança

### Security Architecture

```mermaid
graph TB
    subgraph "Authentication Layer"
        A[Supabase Auth]
        B[JWT Tokens]
        C[Secure Cookies]
        D[Token Refresh]
    end
    
    subgraph "Authorization Layer"
        E[Role-Based Access]
        F[Permission Checks]
        G[Route Protection]
    end
    
    subgraph "Data Protection"
        H[Input Validation]
        I[SQL Injection Prevention]
        J[XSS Protection]
        K[CSRF Protection]
    end
    
    subgraph "Network Security"
        L[HTTPS Only]
        M[CORS Configuration]
        N[Rate Limiting]
    end
    
    A --> B
    B --> C
    C --> D
    E --> F
    F --> G
    H --> I
    I --> J
    J --> K
    L --> M
    M --> N

    style A fill:#f8bbd0
    style E fill:#ffccbc
    style H fill:#fff9c4
    style L fill:#c8e6c9
```

---

## 📝 Considerações Finais

### Padrões de Arquitetura Utilizados

1. **Separation of Concerns**: Clara separação entre camadas (UI, lógica de negócio, dados)
2. **Component-Based Architecture**: Componentes reutilizáveis e modulares
3. **Service Layer Pattern**: Camada de serviços para isolamento de lógica de API
4. **Repository Pattern**: Abstração do acesso a dados via Supabase
5. **State Management**: Gerenciamento centralizado de estado com Zustand
6. **Edge-First**: Middleware executando na edge para performance
7. **SSR (Server-Side Rendering)**: Renderização no servidor para SEO e performance

### Princípios de Design

- **DRY (Don't Repeat Yourself)**: Reutilização de código através de componentes e serviços
- **SOLID**: Princípios de design orientado a objetos aplicados
- **Accessibility First**: Foco em acessibilidade com Radix UI e suporte a screen readers
- **Mobile First**: Design responsivo começando pelo mobile
- **Performance**: Otimizações em todos os níveis da aplicação
- **Security**: Segurança como prioridade em todas as camadas

### Links Úteis

- [Documentação Next.js](https://nextjs.org/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Shadcn/ui](https://ui.shadcn.com/)
- [Documentação Zustand](https://zustand-demo.pmnd.rs/)
- [Documentação Tailwind CSS](https://tailwindcss.com/docs)

---

**Última atualização**: 2025-11-14  
**Versão**: 2.0.0  
**Mantido por**: Equipe de Desenvolvimento MeguisPet
