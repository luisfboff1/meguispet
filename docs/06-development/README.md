# 👨‍💻 Desenvolvimento

Guias e recursos para desenvolvedores do MeguisPet.

---

## 📋 Documentação

### 📚 Referências
- **[Comandos de Referência](./COMANDOS_REFERENCIA.md)** - Lista completa de comandos úteis do projeto

### ⚡ Performance
- **[Performance Guide](./PERFORMANCE_GUIDE.md)** - Guia de otimização de performance
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY_PERFORMANCE.md)** - Resumo de melhorias de performance
- **[Token Implementation](./IMPLEMENTATION_SUMMARY.md)** - Implementação de expiração de token

### 🐛 Bug Fixes
- **[Correção toLowerCase Error](./bugfixes/CORRECAO_TOLOWERCASE_ERROR.md)** - Correção do erro "toLowerCase is not a function"

---

## 🚀 Quick Start para Desenvolvedores

### 1. Clone e Setup
```bash
# Clone o repositório
git clone https://github.com/luisfboff1/meguispet.git
cd meguispet

# Instale dependências
pnpm install

# Configure ambiente (veja 01-setup/)
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 2. Rodar em Desenvolvimento
```bash
# Com Doppler (recomendado)
pnpm dev

# Sem Doppler
pnpm dev:local

# Com watch mode para rebuild automático
pnpm dev:watch
```

### 3. Build e Teste
```bash
# Build de produção
pnpm build

# Rodar build local
pnpm start

# Lint
pnpm lint

# Type check
pnpm type-check
```

---

## 📚 Comandos Principais

### Desenvolvimento
```bash
pnpm dev              # Rodar em dev (com Doppler)
pnpm dev:local        # Rodar em dev (sem Doppler)
pnpm build            # Build de produção
pnpm start            # Rodar build de produção
pnpm lint             # Lint do código
pnpm lint:fix         # Fix de problemas de lint
```

### Doppler (Env Vars)
```bash
pnpm doppler:setup    # Setup inicial do Doppler
pnpm doppler:check    # Verificar variáveis
pnpm doppler:list     # Listar todas as variáveis
```

### Database
```bash
pnpm db:pull          # Pull schema do Supabase
pnpm db:push          # Push schema para Supabase
pnpm db:seed          # Seed do banco de dados
pnpm db:reset         # Reset do banco
```

### Git
```bash
pnpm commit           # Commit com Conventional Commits
pnpm push             # Push para origin
pnpm pull             # Pull do origin
```

---

## 🎯 Padrões de Código

### Estrutura de Componentes
```typescript
// components/MyComponent.tsx
import { FC } from 'react';

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onClick }) => {
  return (
    <div className="p-4">
      <h1>{title}</h1>
      {onClick && <button onClick={onClick}>Clique aqui</button>}
    </div>
  );
};
```

### Estrutura de API Route
```typescript
// pages/api/myroute.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Validar método
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Validar autenticação
    const session = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Lógica da API
    const data = await fetchData();
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
```

### Estrutura de Service
```typescript
// services/myService.ts
import { supabase } from '@/lib/supabase';

export async function getItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*');
    
  if (error) throw error;
  return data;
}

export async function createItem(item: ItemInput) {
  const { data, error } = await supabase
    .from('items')
    .insert(item)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

---

## 🧪 Testing

### Estrutura de Testes
```typescript
// __tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders title correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = jest.fn();
    render(<MyComponent title="Test" onClick={onClick} />);
    
    screen.getByText('Clique aqui').click();
    expect(onClick).toHaveBeenCalled();
  });
});
```

---

## 🔍 Debugging

### Console Logs
```typescript
// Desenvolvimento
console.log('Debug:', data);

// Produção (evite)
// Use ferramentas de monitoramento como Sentry
```

### React DevTools
- Instale a extensão React DevTools
- Inspecione componentes e estados
- Profile performance

### Network Tab
- Monitore requisições API
- Verifique payloads
- Analise tempos de resposta

---

## 📊 Performance Tips

### Otimizações Implementadas
- ✅ Server Components quando possível
- ✅ Dynamic imports para code splitting
- ✅ Imagens otimizadas com Next/Image
- ✅ Cache de requisições
- ✅ Memoization de componentes pesados
- ✅ Lazy loading de componentes

### Checklist de Performance
- [ ] Usar Server Components por padrão
- [ ] Client Components apenas quando necessário
- [ ] Otimizar imagens (WebP, tamanhos corretos)
- [ ] Minimizar bundle size
- [ ] Cache de dados quando aplicável
- [ ] Debounce em inputs de busca
- [ ] Virtualização de listas grandes

---

## 🔗 Links Relacionados

- [Setup](../01-setup/) - Configuração inicial
- [Architecture](../02-architecture/) - Arquitetura do projeto
- [API](../05-api/) - Documentação de APIs
- [Deployment](../07-deployment/) - Deploy e produção

---

[⬅️ Voltar para Documentação](../README.md)
