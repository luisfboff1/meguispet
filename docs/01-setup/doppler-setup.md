# Doppler Setup Guide

Este projeto usa [Doppler](https://www.doppler.com/) para gerenciamento de variáveis de ambiente.

## 1. Instalação do Doppler CLI

### Windows (PowerShell como Administrador)
```powershell
# Via Scoop (recomendado)
scoop bucket add doppler https://github.com/DopplerHQ/scoop-doppler.git
scoop install doppler

# Ou via instalador direto
# Baixe de: https://cli.doppler.com/install/windows
```

### macOS
```bash
brew install dopplerhq/cli/doppler
```

### Linux
```bash
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt-get update && sudo apt-get install doppler
```

## 2. Autenticação

```bash
# Login no Doppler
doppler login

# Verificar autenticação
doppler me
```

## 3. Setup do Projeto

**✅ O projeto já vem pré-configurado!**

O arquivo `.doppler.yaml` já está commitado no repositório e aponta para:
- **Project**: `meguispet`
- **Config**: `dev` (desenvolvimento local)

Você só precisa garantir que o projeto `meguispet` existe no seu Doppler:

```bash
# Verificar se está apontando para o projeto correto
cat .doppler.yaml

# Se precisar reconfigurar (raro)
doppler setup
# Selecione:
# - Project: meguispet
# - Config: dev
```

**Nota**: O `.doppler.yaml` é commitado no git (não contém segredos) para garantir que todos os desenvolvedores usem o mesmo projeto Doppler.

## 4. Configurar Ambientes no Doppler

No dashboard do Doppler (https://dashboard.doppler.com/), configure as seguintes variáveis:

### Ambiente: `dev` (desenvolvimento)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=/api
```

### Ambiente: `prd` (produção - para Vercel)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=https://gestao.meguispet.com/api
```

## 5. Uso Diário

### Desenvolvimento
```bash
# Com Doppler (recomendado - puxa variáveis automaticamente)
pnpm run dev

# Sem Doppler (usa .env.local)
pnpm run dev:local
```

### Build
```bash
# Com Doppler
pnpm run build

# Sem Doppler
pnpm run build:local
```

### Produção Local
```bash
# Com Doppler
pnpm run start

# Sem Doppler
pnpm run start:local
```

## 6. Verificar Variáveis

```bash
# Ver todas as variáveis do ambiente atual
doppler secrets

# Ver valor específico
doppler secrets get NEXT_PUBLIC_SUPABASE_URL

# Rodar comando único com Doppler
doppler run -- node script.js
```

## 7. Trocar de Ambiente

```bash
# Trocar para produção
doppler setup --config prd

# Trocar de volta para dev
doppler setup --config dev

# Ou especificar no comando
doppler run --config prd -- pnpm build
```

## 8. Integração com Vercel

Para usar Doppler na Vercel:

1. Instale a integração Doppler na Vercel: https://vercel.com/integrations/doppler
2. Conecte seu projeto Doppler ao projeto Vercel
3. As variáveis serão sincronizadas automaticamente

Ou use o CLI:
```bash
# Sincronizar variáveis do Doppler para Vercel
doppler secrets download --no-file --format env | vercel env add production
```

## 9. Boas Práticas

1. **Nunca commite** o arquivo `.doppler.yaml` com configurações sensíveis (já está no .gitignore)
2. **Use ambientes diferentes** para dev, staging e produção
3. **Revogue acessos** quando membros saírem da equipe
4. **Use tokens de serviço** para CI/CD (GitHub Actions, etc.)
5. **Mantenha backups** das variáveis importantes

## 10. Troubleshooting

### Erro: "doppler: command not found"
- Certifique-se de que instalou o CLI corretamente
- Reinicie o terminal após a instalação

### Erro: "No Doppler project configured"
- Execute `doppler setup` na raiz do projeto
- Verifique se está autenticado: `doppler me`

### Variáveis não aparecem
- Verifique o ambiente: `doppler configure get config`
- Liste as variáveis: `doppler secrets`
- Tente fazer logout e login novamente

## 11. Migração do .env.local

Se você já tem um `.env.local`, pode importar para o Doppler:

```bash
# Importar variáveis do arquivo
doppler secrets upload .env.local

# Ou manualmente via dashboard
# https://dashboard.doppler.com/
```

Após importar, você pode remover o `.env.local` (mas mantenha um `.env.example` para documentação).

## Arquivos Git

Certifique-se de que `.gitignore` inclui:
```
.env
.env.local
.env.*.local
.doppler.yaml
```

O `.doppler.yaml` pode ser commitado se **não** contiver informações sensíveis, apenas referências ao projeto.
