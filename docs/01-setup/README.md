# ⚙️ Setup e Configuração

Documentação completa para configurar o ambiente de desenvolvimento do MeguisPet.

---

## 📋 Ordem de Setup Recomendada

1. **[Doppler Setup](./doppler-setup.md)** - Configure o Doppler para gerenciar variáveis de ambiente
2. **[Supabase CLI](./supabase-cli.md)** - Instale a CLI do Supabase (opcional, para dev local)
3. **[Agents Config](./agents-config.md)** - Configure agentes do Claude Code (opcional)
4. **[Setup Complete](./setup-complete.md)** - Verifique se tudo está configurado

---

## 🔑 Variáveis de Ambiente Necessárias

### Supabase (Obrigatório)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### API (Opcional)
```bash
NEXT_PUBLIC_API_URL=/api  # Padrão se não especificado
```

### Legacy (Se ainda usar PHP APIs)
```bash
DB_HOST=localhost
DB_NAME=u123456_meguispet
DB_USER=u123456_admin
DB_PASSWORD=your_password
```

---

## 📦 Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/meguispet.git
cd meguispet

# 2. Instale dependências
pnpm install

# 3. Configure Doppler (recomendado)
# Ver: doppler-setup.md

# 4. Ou crie .env.local (alternativa)
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 5. Rode o projeto
pnpm dev              # Com Doppler
pnpm dev:local        # Sem Doppler (usa .env.local)
```

---

## 🔗 Documentos

| Documento | Descrição | Status |
|-----------|-----------|--------|
| [doppler-setup.md](./doppler-setup.md) | Setup do Doppler para env vars | ✅ Completo |
| [doppler-migration.md](./doppler-migration.md) | Migração para Doppler | ✅ Completo |
| [supabase-cli.md](./supabase-cli.md) | Instalação Supabase CLI | ✅ Completo |
| [agents-config.md](./agents-config.md) | Config de agentes Claude | ✅ Completo |
| [setup-complete.md](./setup-complete.md) | Checklist de verificação | ✅ Completo |

---

## ⚠️ Problemas Comuns

### Erro: "Supabase env vars not found"
- Certifique-se de configurar as variáveis do Supabase
- Se usar Doppler: `pnpm doppler:check`
- Se usar .env.local: verifique se o arquivo existe

### Erro: "Port 3000 already in use"
```bash
# Mate o processo na porta 3000
npx kill-port 3000

# Ou use outra porta
PORT=3001 pnpm dev
```

### Dependências não instalam
```bash
# Limpe cache e reinstale
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## 📞 Suporte

Se encontrar problemas:
1. Consulte [setup-complete.md](./setup-complete.md)
2. Veja os logs de erro detalhados
3. Abra uma issue no GitHub

---

[⬅️ Voltar para Documentação](../README.md)
