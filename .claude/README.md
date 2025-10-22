# Twin Development Agents

Sistema completo de agentes especializados para desenvolvimento JavaScript/TypeScript com foco em programação funcional e qualidade de código.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Agentes Disponíveis](#agentes-disponíveis)
- [Workflows](#workflows)
- [Como Usar](#como-usar)
- [Princípios de Código](#princípios-de-código)
- [Instalação](#instalação)

## 🎯 Visão Geral

Os Twin Agents são agentes especializados que trabalham juntos em um workflow coordenado para:
- Analisar requisitos e código existente
- Criar planos de implementação técnicos
- Desenvolver código seguindo princípios funcionais
- Revisar qualidade, segurança e performance
- Testar funcionalidades manualmente (QA real)
- Documentar sessões de desenvolvimento

### Diferencial

- **Programação Funcional**: Todos os agentes seguem princípios funcionais estritos
- **Código Auto-documentado**: Sem comentários - código claro e descritivo
- **QA Automatizado**: Loop de desenvolvimento-revisão-teste até validação completa
- **Economizador de Tokens**: Modo econômico com ~70% de economia

## 🤖 Agentes Disponíveis

### Planejamento & Análise

#### `twin-analyst` (red)
**Modelo:** sonnet

Analista técnico especializado em examinar código para entender implementações ou correções.

**Quando usar:**
- Análise de features ou bugs
- Investigação de codebase existente
- Identificação de mudanças necessárias
- Entendimento de constraints técnicos

**Output:**
- Estado atual do código
- Restrições técnicas
- Arquivos relevantes
- Componentes UI disponíveis (frontend)
- Causa raiz (bugs)

#### `twin-architect` (cyan)
**Modelo:** sonnet

Arquiteto rápido que combina análise + planejamento em uma única etapa eficiente.

**Quando usar:**
- Workflow econômico
- Análise e planejamento rápidos
- Minimizar uso de tokens

**Output:**
- Análise rápida (2-3 sentenças)
- Plano de implementação direto
- Arquivos a modificar
- Passos de implementação

#### `twin-planner` (green)
**Modelo:** sonnet

Planejador técnico que cria planos de implementação diretos e acionáveis.

**Quando usar:**
- Após análise do twin-analyst
- Criação de plano detalhado de implementação
- Workflow completo com QA

**Output:**
- Problema atual
- Solução proposta
- Componentes UI a reutilizar (frontend)
- Arquivos a criar/modificar
- Ordem de implementação
- Riscos técnicos
- Plano de validação QA

### Desenvolvimento

#### `twin-developer` (blue)
**Modelo:** sonnet

Desenvolvedor expert em JavaScript/TypeScript com foco em programação funcional.

**Quando usar:**
- Implementação de features ou correções
- Workflow completo com revisão separada
- Código que requer alta qualidade

**Características:**
- Código auto-documentado (sem comentários)
- Apenas `const` (nunca `let` ou `var`)
- Funções puras e composição
- Error handling robusto por nível de qualidade
- Correção de bugs baseado em QA reports

**Níveis de Qualidade:**
- **pragmatic**: Implementação direta, error handling básico
- **balanced**: Abstrações inteligentes, error handling completo
- **strict**: Padrões completos, todos os edge cases, otimização

#### `twin-coder` (teal)
**Modelo:** sonnet

Desenvolvedor rápido com revisão inline de qualidade durante desenvolvimento.

**Quando usar:**
- Workflow econômico
- Desenvolvimento + auto-revisão em um passo
- Economia de ~40% de tokens vs dev+review separados

**Características:**
- Mesmos princípios do twin-developer
- Revisão inline durante codificação
- Checklist de qualidade automatizado
- Output inclui resumo de qualidade

### Quality Assurance

#### `twin-reviewer` (purple)
**Modelo:** sonnet

Revisor expert em qualidade de código, segurança e performance.

**Quando usar:**
- Após desenvolvimento (workflow completo)
- Revisão de correções de bugs
- Validação de segurança

**Analisa:**
- Qualidade de código e functional programming
- Regras do Biome (linting/formatting)
- Vulnerabilidades de segurança
- Performance e otimizações
- Validação de lógica
- UI/UX conformance (frontend)
- Regressões potenciais (bug fixes)

**Output:**
- Summary de qualidade
- Issues críticos
- Violações de best practices
- Performance concerns
- UI/UX conformance (frontend)
- Sugestões de melhoria
- Recomendação final (approve/needs changes/refactor)

#### `twin-tester` (default)
**Modelo:** sonnet

QA Specialist que valida funcionalidade através de testes manuais reais.

**Quando usar:**
- Validação final de features
- Testes exploratórios
- Workflow completo com QA

**Diferencial:**
- **NÃO cria testes automatizados** (Jest/Vitest)
- **Testa funcionalidade real** como um usuário humano
- **Frontend**: Usa Playwright MCP para interagir com browser
- **Backend**: Usa curl e scripts Node.js

**Cenários Testados:**
- Happy path
- Edge cases (valores vazios, máximos, caracteres especiais)
- Error handling
- UI feedback (loading, success/error messages)
- Data persistence
- Navigation (frontend)
- Status codes e responses (backend)

**Output:**
- ✅ Report de sucesso: features validadas, cenários testados
- ❌ Bug report: steps de reprodução, evidências, recomendações

### Documentação

#### `twin-documenter` (orange)
**Modelo:** sonnet

Especialista em documentação técnica concisa e valiosa.

**Quando usar:**
- Final de sessões de desenvolvimento
- Documentar mudanças e decisões
- Criar changelogs

**Output:**
- Summary da sessão
- Changes (conventional commits format)
- Technical decisions (apenas decisões significativas)
- Known issues / Future work

**Formato de changelog:**
```
feat(scope): description
fix(scope): description
refactor(scope): description
```

## 🔄 Workflows

### `/twin-workflow` - Workflow Completo

Pipeline completo de desenvolvimento com QA automatizado.

**Fases:**

1. **Planning (se não existe plano)**
   - twin-analyst analisa o código
   - twin-planner cria plano de implementação
   - Salva em `./twin-plan-current.md`
   - Para para aprovação do usuário

2. **Execution (quando usuário aprova)**
   - twin-developer implementa seguindo o plano
   - twin-reviewer valida qualidade
   - twin-tester faz QA manual
   - **Loop automático** se bugs forem encontrados:
     * QA gera report detalhado de bugs
     * Developer corrige bugs específicos
     * Reviewer valida correções
     * Tester valida correções (regression testing)
     * Repete até todos os testes passarem
   - twin-documenter documenta a sessão
   - Arquiva plano em `./twin-plans/`

**Uso:**
```bash
# Criar plano
/twin-workflow "implement user authentication"

# Revisar plano em ./twin-plan-current.md
# Editar se necessário

# Aprovar e executar
ok
```

**Com nível de qualidade:**
```bash
/twin-workflow "refactor payment module" --quality=balanced
```

**Quando usar:**
- Features de produção
- Integrações complexas
- Correções críticas de bugs
- Quando QA completo é necessário

### `/twin-workflow-eco` - Workflow Econômico

Pipeline rápido com ~70% de economia de tokens.

**Fases:**

1. **Planning (se não existe plano)**
   - twin-architect analisa E planeja em um passo
   - Salva em `./twin-plan-current.md`
   - Para para aprovação

2. **Execution (quando usuário aprova)**
   - twin-coder implementa com revisão inline
   - Sugestão de teste manual
   - Arquiva plano em `./twin-plans/`

**Uso:**
```bash
/twin-workflow-eco "fix login validation bug"
ok
```

**Quando usar:**
- Features pequenas
- Bug fixes simples
- Ferramentas internas
- Prototypes
- Iterações e refinamentos
- Quando você vai testar manualmente

**Economia de Tokens:**
| Componente | Full | Eco | Economia |
|------------|------|-----|----------|
| Planning | analyst + planner | architect (merged) | ~20% |
| Development | developer | coder (inline review) | ~15% |
| Code Review | reviewer | (inline) | ~15% |
| QA Testing | tester (loop) | manual suggestion | ~60% |
| Documentation | documenter | summary | ~5% |
| **TOTAL** | 100% | ~25-30% | **~70-75%** |

## 💻 Como Usar

### Workflow Interativo

1. **Inicie o workflow:**
```bash
/twin-workflow "sua tarefa aqui"
```

2. **Revise o plano gerado:**
- Arquivo criado em `./twin-plan-current.md`
- Edite o arquivo se quiser modificar
- Ou apenas continue se estiver bom

3. **Aprove e execute:**
```bash
ok
# ou
continue
# ou
approve
```

4. **Workflow executa automaticamente:**
- Desenvolvimento
- Revisão
- QA Testing (com loop automático de correções)
- Documentação

### Níveis de Qualidade

Especifique o nível de qualidade desejado:

**pragmatic** (padrão):
- Soluções diretas e funcionais
- Abstrações mínimas
- Error handling básico
- Foco em funcionalidade

**balanced**:
- Abstrações inteligentes
- Error handling completo
- Uso moderado de padrões
- Considerações de performance

**strict**:
- Padrões de design completos
- Todos os edge cases tratados
- Máxima reusabilidade
- Performance otimizada

Exemplo:
```bash
/twin-workflow "implement payment gateway" --quality=strict
```

### Estrutura de Arquivos

```
./
├── .claude/
│   ├── agents/               # Agentes especializados
│   │   ├── twin-analyst.md
│   │   ├── twin-architect.md
│   │   ├── twin-planner.md
│   │   ├── twin-developer.md
│   │   ├── twin-coder.md
│   │   ├── twin-reviewer.md
│   │   ├── twin-tester.md
│   │   └── twin-documenter.md
│   ├── commands/             # Workflows
│   │   ├── twin-workflow.md
│   │   └── twin-workflow-eco.md
│   └── README.md            # Este arquivo
├── twin-plan-current.md     # Plano ativo (temporário)
├── twin-plans/              # Planos arquivados
│   ├── 2025-01-19-14-30-plan.md
│   └── 2025-01-19-16-45-eco-plan.md
└── docs/sessions/           # Documentação de sessões
```

## 📐 Princípios de Código

Todos os agentes seguem estes princípios **NÃO-NEGOCIÁVEIS**:

### Functional Programming

1. **Apenas `const`**
   - Nunca use `let` ou `var`
   - Todas as variáveis são imutáveis

2. **Funções Puras**
   - Minimize side effects
   - Entrada → Processamento → Saída
   - Sem dependências de estado externo

3. **Sem Comentários**
   - Código deve ser auto-explicativo
   - Nomes descritivos eliminam necessidade de comentários
   - Se precisa de comentário, refatore o código

4. **Naming Descritivo**
   - Funções: `calculateUserDiscountPrice` não `calcPrice`
   - Variáveis: `isEmailValid` não `valid`
   - Booleans: `isActive`, `hasPermission`, `shouldRender`

5. **Composition**
   - Construa lógica complexa de funções pequenas
   - Prefira composição sobre herança
   - Evite classes, use funções e closures

6. **Imutabilidade**
   - Sem shared mutable state
   - Use transformações imutáveis
   - Array methods: map, filter, reduce

### Exemplos

❌ **MAU:**
```typescript
let total = 0; // let não é permitido
for (let i = 0; i < items.length; i++) { // loop imperativo
  total += items[i].price;
}
// Calcula o total - comentário desnecessário
return total;
```

✅ **BOM:**
```typescript
const calculateTotalPrice = (items) =>
  items.reduce((total, item) => total + item.price, 0);

const total = calculateTotalPrice(items);
return total;
```

❌ **MAU:**
```typescript
function proc(d) { // nome não descritivo
  if (d) { // sem clareza de lógica
    return d * 1.1;
  }
  return 0;
}
```

✅ **BOM:**
```typescript
const calculatePriceWithTax = (price) => {
  const hasValidPrice = price > 0;
  return hasValidPrice ? price * 1.1 : 0;
};
```

### Error Handling por Nível

**pragmatic:**
```typescript
const getUserData = async (userId) => {
  try {
    const user = await db.findUser(userId);
    return user || null;
  } catch (error) {
    throw new Error("Failed to fetch user");
  }
};
```

**balanced:**
```typescript
const getUserData = async (userId) => {
  if (!userId?.trim()) {
    throw new Error("User ID is required");
  }

  try {
    const user = await db.findUser(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw new Error("Database connection failed");
    }
    throw error;
  }
};
```

**strict:**
```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const getUserData = async (userId): Promise<Result<User>> => {
  if (!userId?.trim()) {
    return {
      success: false,
      error: "User ID is required and must not be empty"
    };
  }

  if (!isValidUserId(userId)) {
    return {
      success: false,
      error: "Invalid user ID format"
    };
  }

  try {
    const user = await db.findUser(userId);
    if (!user) {
      return {
        success: false,
        error: `User not found with ID: ${userId}`
      };
    }
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof DatabaseConnectionError) {
      return {
        success: false,
        error: "Unable to connect to database"
      };
    }
    if (error instanceof QueryTimeoutError) {
      return {
        success: false,
        error: "Database query timed out"
      };
    }
    return {
      success: false,
      error: "An unexpected error occurred"
    };
  }
};
```

## 🚀 Instalação

### Para Este Projeto

Os agentes já estão instalados em `.claude/agents/` e `.claude/commands/`.

### Para Novos Projetos

Use os scripts de instalação para copiar os agentes para novos projetos:

**Windows (PowerShell):**
```powershell
.\install-twin-agents.ps1
```

**Linux/Mac (Bash):**
```bash
bash install-twin-agents.sh
```

Estes scripts:
1. Detectam o diretório global do Claude Code
2. Copiam todos os agentes de `$APPDATA/claude-code/agents/` para `.claude/agents/`
3. Copiam todos os workflows de `$APPDATA/claude-code/commands/` para `.claude/commands/`
4. Exibem resumo da instalação

## 📚 Recursos Adicionais

- **CLAUDE.md** - Documentação principal do projeto
- **Agentes Individuais** - Cada arquivo `.md` em `agents/` tem documentação detalhada
- **Workflows** - Cada arquivo `.md` em `commands/` tem exemplos de uso

## 🎯 Quick Start

```bash
# Feature completa com QA
/twin-workflow "implement user profile page"
ok

# Bug fix rápido
/twin-workflow-eco "fix navigation link"
ok

# Feature com alta qualidade
/twin-workflow "implement payment integration" --quality=strict
ok
```

---

**Desenvolvido para máxima eficiência e qualidade de código.**
