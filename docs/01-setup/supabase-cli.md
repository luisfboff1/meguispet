# Instalação do Supabase CLI ✅

**Data:** 2025-01-14
**Método:** Instalação manual via GitHub releases
**Status:** Instalado com sucesso

---

## 📦 Problema Original

A instalação via Scoop estava falhando devido a problemas com o 7zip:
- Site www.7-zip.org inacessível
- Certificado SSL com problemas
- Instalação do 7zip bloqueando o Supabase CLI

---

## ✅ Solução Implementada

### Instalação Manual via GitHub Releases

1. **Download do binário**
   ```bash
   # Baixado de: https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz
   # Versão instalada: 2.58.5
   ```

2. **Extração**
   ```bash
   tar -xzf supabase.tar.gz
   ```

3. **Localização do executável**
   ```
   C:\Users\Luisf\.local\bin\supabase.exe
   ```

4. **Adicionado ao PATH do usuário**
   ```powershell
   # PATH atualizado para incluir:
   C:\Users\Luisf\.local\bin
   ```

---

## 🚀 Como Usar

### Comandos Disponíveis

```bash
# Verificar versão
supabase --version

# Fazer login
supabase login

# Iniciar projeto local
supabase init

# Iniciar banco de dados local
supabase start

# Aplicar migrações
supabase db push

# Ver status
supabase status

# Parar banco de dados local
supabase stop
```

---

## 📍 Localização dos Arquivos

```
C:\Users\Luisf\.local\bin\
├── supabase.exe (44.5 MB)
└── [outros executáveis locais]
```

---

## 🔄 Atualização Futura

### Método Manual (Recomendado)

1. Baixar nova versão:
   ```bash
   cd /c/Users/Luisf
   powershell -Command "Invoke-WebRequest -Uri 'https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz' -OutFile 'supabase.tar.gz'"
   ```

2. Extrair:
   ```bash
   tar -xzf supabase.tar.gz
   ```

3. Substituir executável:
   ```bash
   mv supabase.exe ~/.local/bin/supabase.exe
   ```

4. Limpar:
   ```bash
   rm supabase.tar.gz
   ```

### Método Scoop (Alternativo - quando 7zip funcionar)

```bash
# Adicionar bucket (já feito)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Atualizar
scoop update supabase
```

---

## ✅ Verificação

```bash
# Testar comando
supabase --version
# Output: 2.58.5

# Testar help
supabase --help

# Testar em diferentes shells
powershell -Command "supabase --version"  # ✅ Funciona
cmd /c "supabase --version"                # ✅ Funciona
bash -c "supabase --version"               # ✅ Funciona
```

---

## 🔧 Troubleshooting

### Se o comando não for encontrado:

1. **Verificar PATH**
   ```powershell
   [Environment]::GetEnvironmentVariable('Path', 'User')
   ```
   Deve incluir: `C:\Users\Luisf\.local\bin`

2. **Reabrir terminal**
   - Fechar e abrir novo terminal/PowerShell/CMD
   - Variáveis de ambiente são carregadas ao iniciar

3. **Executar diretamente**
   ```bash
   C:\Users\Luisf\.local\bin\supabase.exe --version
   ```

### Se precisar reinstalar:

```bash
# Remover executável
rm C:\Users\Luisf\.local\bin\supabase.exe

# Baixar e instalar novamente (comandos acima)
```

---

## 📚 Documentação Oficial

- **CLI Reference**: https://supabase.com/docs/reference/cli
- **Getting Started**: https://supabase.com/docs/guides/cli
- **GitHub Releases**: https://github.com/supabase/cli/releases

---

## 🎯 Próximos Passos

Para usar o Supabase CLI com o projeto MeguisPet:

1. **Login no Supabase**
   ```bash
   supabase login
   ```

2. **Link com projeto existente**
   ```bash
   supabase link --project-ref <seu-project-id>
   ```

3. **Aplicar migrações**
   ```bash
   # Aplicar migration 008_reports_system.sql
   supabase db push
   ```

4. **Desenvolvimento local** (opcional)
   ```bash
   # Iniciar Supabase local com Docker
   supabase start
   ```

---

**Status:** ✅ Instalado e funcionando globalmente
**Versão:** 2.58.5
**Método:** Manual (GitHub releases)
**Localização:** `C:\Users\Luisf\.local\bin\supabase.exe`
