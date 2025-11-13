# Migração de .env.local para Doppler

Se você já tem um arquivo `.env.local` funcionando, este guia te ajuda a migrar para o Doppler em 5 minutos.

## Por que migrar?

✅ **Centralização**: Uma única fonte de verdade para todas as variáveis
✅ **Segurança**: Não precisa versionar ou compartilhar `.env.local`
✅ **Sincronização**: Equipe sempre com as variáveis atualizadas
✅ **Ambientes**: Fácil alternar entre dev, staging, produção
✅ **Auditoria**: Rastreie quem mudou o quê e quando
✅ **Integração**: Sincroniza automaticamente com Vercel, AWS, etc.

## Passo 1: Instalar Doppler CLI

### Windows (PowerShell como Administrador)
```powershell
scoop bucket add doppler https://github.com/DopplerHQ/scoop-doppler.git
scoop install doppler
```

### macOS
```bash
brew install dopplerhq/cli/doppler
```

### Linux (Debian/Ubuntu)
```bash
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt-get update && sudo apt-get install doppler
```

## Passo 2: Criar Conta e Login

```bash
# Login (abre navegador)
doppler login

# Verificar autenticação
doppler me
```

## Passo 3: Criar Projeto no Doppler

No dashboard do Doppler (https://dashboard.doppler.com/):
1. Clique em "Create Project"
2. Nome: `meguispet` (ou nome desejado)
3. Ele criará automaticamente ambientes: `dev`, `stg`, `prd`

## Passo 4: Importar Variáveis do .env.local

**✅ O projeto já está pré-configurado!**

O arquivo `.doppler.yaml` no repositório já aponta para o projeto `meguispet` no ambiente `dev`.

### Opção A: Upload via CLI (Recomendado)

```bash
# Verificar configuração (projeto já está configurado)
cat .doppler.yaml
# Deve mostrar: project: meguispet, config: dev

# Importar variáveis do .env.local
doppler secrets upload .env.local

# Verificar se importou corretamente
doppler secrets
```

### Opção B: Copiar Manualmente via Dashboard

1. Acesse https://dashboard.doppler.com/
2. Selecione seu projeto → ambiente `dev`
3. Copie e cole as variáveis do `.env.local` manualmente

## Passo 5: Testar

```bash
# Verificar variáveis carregadas
pnpm doppler:check

# Testar desenvolvimento
pnpm dev

# Se tudo funcionar, você pode remover .env.local
# (mas mantenha um backup por segurança)
mv .env.local .env.local.backup
```

## Passo 6: Configurar Ambientes Adicionais

### Desenvolvimento Local (dev) - já configurado ✅

### Produção (prd)
```bash
# Trocar para ambiente de produção
doppler setup --config prd

# Adicionar/editar variáveis específicas de produção
doppler secrets set NEXT_PUBLIC_API_URL=https://gestao.meguispet.com/api

# Voltar para dev
doppler setup --config dev
```

## Passo 7: Integração com Vercel

### Opção A: Via Integração Oficial (Recomendado)

1. Acesse: https://vercel.com/integrations/doppler
2. Clique em "Add Integration"
3. Conecte seu projeto Doppler ao projeto Vercel
4. Selecione quais ambientes sincronizar (dev → Preview, prd → Production)
5. ✅ Sincronização automática configurada!

### Opção B: Via CLI

```bash
# Exportar variáveis do Doppler para Vercel
doppler run --config prd -- vercel env pull .env.vercel.production
vercel env add production < .env.vercel.production
```

## Scripts Úteis

```bash
# Verificar configuração do Doppler
pnpm doppler:check

# Ver todas as variáveis do ambiente atual
pnpm doppler:secrets

# Reconfigurar projeto/ambiente
pnpm doppler:setup

# Dev com verificação automática
pnpm dev:check

# Dev sem Doppler (usa .env.local)
pnpm dev:local
```

## Dicas de Uso Diário

### Desenvolvimento Normal
```bash
pnpm dev  # Usa Doppler automaticamente
```

### Trocar de Ambiente
```bash
# Ver ambiente atual
doppler configure get config

# Trocar para produção
doppler setup --config prd

# Trocar para dev
doppler setup --config dev
```

### Adicionar Nova Variável
```bash
# Via CLI
doppler secrets set NEW_VAR=value

# Via dashboard
# https://dashboard.doppler.com/
```

### Compartilhar com Equipe

1. Convide membros via dashboard: https://dashboard.doppler.com/
2. Defina permissões (read-only, editor, admin)
3. Eles fazem `doppler login` e `doppler setup`
4. ✅ Todos têm as mesmas variáveis!

## Troubleshooting

### "Variáveis não estão sendo injetadas"
```bash
# Verificar configuração
pnpm doppler:check

# Listar variáveis disponíveis
doppler secrets

# Tentar reconfigurar
doppler setup
```

### "Erro de autenticação"
```bash
# Fazer logout e login novamente
doppler logout
doppler login
```

### "Preciso usar .env.local temporariamente"
```bash
# Use o script :local
pnpm dev:local
pnpm build:local
pnpm start:local
```

## Rollback (Se Necessário)

Se algo der errado, você pode voltar para `.env.local`:

```bash
# Restaurar backup
mv .env.local.backup .env.local

# Usar scripts :local
pnpm dev:local
```

## Boas Práticas

1. ✅ **Nunca commite** `.env.local` ou `.doppler.yaml` com secrets
2. ✅ **Use ambientes diferentes** para dev, staging, produção
3. ✅ **Revogue acessos** quando membros saírem
4. ✅ **Ative auditoria** no dashboard para rastrear mudanças
5. ✅ **Use tokens de serviço** para CI/CD (não compartilhe credenciais pessoais)
6. ✅ **Mantenha backup** das variáveis críticas em local seguro

## Próximos Passos

- [ ] Configurar ambiente de staging (stg)
- [ ] Adicionar membros da equipe ao projeto
- [ ] Configurar webhooks para notificações de mudanças
- [ ] Explorar integrações com AWS, GCP, etc.
- [ ] Configurar secrets rotation para chaves sensíveis

## Recursos Adicionais

- 📚 Documentação oficial: https://docs.doppler.com/
- 🎥 Vídeos tutoriais: https://www.doppler.com/resources
- 💬 Suporte: https://doppler.com/community
- 📖 Documentação completa do projeto: `DOPPLER_SETUP.md`
