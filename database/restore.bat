@echo off
REM =============================================
REM SCRIPT DE RESTORE - PostgreSQL (Supabase)
REM Schemas: public + auth
REM =============================================
@REM cd database; ./restore.bat
@REM Uso: restore.bat [TIMESTAMP] [TYPE]
@REM   TIMESTAMP: (opcional) 2025_01_29_143022
@REM   TYPE: (opcional) full | structure | data

REM Adicionar PostgreSQL ao PATH (usa versão 18 - compatível com servidor 17.6)
set PATH=C:\Program Files\PostgreSQL\18\bin;%PATH%

REM Configurações do Supabase - MeguisPet
set DB_HOST=aws-1-sa-east-1.pooler.supabase.com
set DB_PORT=6543
set DB_NAME=postgres
set DB_USER=postgres.jsitmcqabchjidoezycj
REM Senha via ambiente — NUNCA hardcode. Defina antes de rodar (ou use Doppler):
REM   PowerShell:  $env:PGPASSWORD = '<senha>'
if "%PGPASSWORD%"=="" (
    echo [ERRO] Defina a variavel de ambiente PGPASSWORD antes de rodar este script.
    exit /b 1
)

REM Diretório base de backup
set BASE_BACKUP_DIR=backup

echo ========================================
echo 🔄 RESTORE DO BANCO DE DADOS - MEGUISPET
echo ========================================
echo 🌐 Host: %DB_HOST%
echo 📁 Diretório de backups: %BASE_BACKUP_DIR%\
echo ========================================
echo.

REM =============================================
REM VERIFICAR SE PSQL ESTÁ DISPONÍVEL
REM =============================================
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERRO: PostgreSQL não encontrado no PATH!
    echo.
    echo Por favor, instale PostgreSQL 18 ou adicione ao PATH:
    echo set PATH=C:\Program Files\PostgreSQL\18\bin;%%PATH%%
    echo.
    pause
    exit /b 1
)

REM =============================================
REM VERIFICAR PARÂMETROS DA LINHA DE COMANDO
REM =============================================
if "%1"=="" goto INTERACTIVE_MODE
if "%2"=="" goto INTERACTIVE_MODE

REM Modo não-interativo (timestamp e tipo fornecidos)
set TIMESTAMP=%1
set RESTORE_TYPE=%2
goto VALIDATE_BACKUP

REM =============================================
REM MODO INTERATIVO - LISTAR BACKUPS DISPONÍVEIS
REM =============================================
:INTERACTIVE_MODE

echo 📋 Backups disponíveis:
echo.
dir /b /ad "%BASE_BACKUP_DIR%" 2>nul
if %errorlevel% neq 0 (
    echo ❌ Nenhum backup encontrado no diretório "%BASE_BACKUP_DIR%"!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
set /p TIMESTAMP="📅 Digite o TIMESTAMP do backup (ex: 2025_01_29_143022): "

if "%TIMESTAMP%"=="" (
    echo ❌ ERRO: Timestamp não pode estar vazio!
    pause
    exit /b 1
)

REM =============================================
REM ESCOLHER TIPO DE RESTORE
REM =============================================
echo.
echo ========================================
echo 📦 Tipo de restore:
echo ========================================
echo.
echo [1] FULL - Restauração completa (estrutura + dados)
echo         ⚠️  Irá DROPAR schemas existentes!
echo.
echo [2] STRUCTURE - Apenas estrutura (tabelas, índices, constraints)
echo         ℹ️  Útil para criar ambiente vazio
echo.
echo [3] DATA - Apenas dados (INSERT statements)
echo         ⚠️  Requer estrutura idêntica já existente!
echo.
set /p RESTORE_OPTION="Escolha [1/2/3]: "

if "%RESTORE_OPTION%"=="1" set RESTORE_TYPE=full
if "%RESTORE_OPTION%"=="2" set RESTORE_TYPE=structure
if "%RESTORE_OPTION%"=="3" set RESTORE_TYPE=data

if "%RESTORE_TYPE%"=="" (
    echo ❌ ERRO: Opção inválida!
    pause
    exit /b 1
)

REM =============================================
REM VALIDAR SE O BACKUP EXISTE
REM =============================================
:VALIDATE_BACKUP

set BACKUP_DIR=%BASE_BACKUP_DIR%\%TIMESTAMP%

if not exist "%BACKUP_DIR%" (
    echo ❌ ERRO: Diretório de backup não encontrado: %BACKUP_DIR%
    echo.
    pause
    exit /b 1
)

REM Verificar se os arquivos necessários existem
if "%RESTORE_TYPE%"=="full" (
    if not exist "%BACKUP_DIR%\meguispet_full_%TIMESTAMP%.sql" (
        echo ❌ ERRO: Arquivo meguispet_full_%TIMESTAMP%.sql não encontrado!
        pause
        exit /b 1
    )
    if not exist "%BACKUP_DIR%\auth_full_%TIMESTAMP%.sql" (
        echo ❌ ERRO: Arquivo auth_full_%TIMESTAMP%.sql não encontrado!
        pause
        exit /b 1
    )
)

if "%RESTORE_TYPE%"=="structure" (
    if not exist "%BACKUP_DIR%\meguispet_structure_%TIMESTAMP%.sql" (
        echo ❌ ERRO: Arquivo meguispet_structure_%TIMESTAMP%.sql não encontrado!
        pause
        exit /b 1
    )
    if not exist "%BACKUP_DIR%\auth_structure_%TIMESTAMP%.sql" (
        echo ❌ ERRO: Arquivo auth_structure_%TIMESTAMP%.sql não encontrado!
        pause
        exit /b 1
    )
)

if "%RESTORE_TYPE%"=="data" (
    if not exist "%BACKUP_DIR%\meguispet_data_%TIMESTAMP%.sql" (
        echo ❌ ERRO: Arquivo meguispet_data_%TIMESTAMP%.sql não encontrado!
        pause
        exit /b 1
    )
    if not exist "%BACKUP_DIR%\auth_data_%TIMESTAMP%.sql" (
        echo ❌ ERRO: Arquivo auth_data_%TIMESTAMP%.sql não encontrado!
        pause
        exit /b 1
    )
)

echo.
echo ✅ Backup encontrado: %BACKUP_DIR%
echo.

REM =============================================
REM CONFIRMAÇÃO FINAL
REM =============================================
echo ========================================
echo ⚠️  CONFIRMAÇÃO DE RESTORE
echo ========================================
echo.
echo 📅 Backup: %TIMESTAMP%
echo 🔄 Tipo: %RESTORE_TYPE%
echo 🌐 Destino: %DB_HOST% / %DB_NAME%
echo.

if "%RESTORE_TYPE%"=="full" (
    echo ⚠️⚠️⚠️  ATENÇÃO ⚠️⚠️⚠️
    echo.
    echo Esta operação irá:
    echo   - DROPAR schemas public e auth existentes
    echo   - RECRIAR todas as tabelas, índices e constraints
    echo   - INSERIR todos os dados do backup
    echo.
    echo ⚠️  ISSO IRÁ SOBRESCREVER TODOS OS DADOS ATUAIS!
    echo.
    echo 💡 Recomendação: Faça um backup do estado atual antes de continuar!
    echo    Execute: backup-complete.bat
    echo.
)

if "%RESTORE_TYPE%"=="data" (
    echo ⚠️  ATENÇÃO
    echo.
    echo Esta operação irá:
    echo   - INSERIR dados do backup nas tabelas existentes
    echo   - Pode causar conflitos de chaves primárias/únicas
    echo.
    echo ✅ Certifique-se de que a estrutura do banco está idêntica ao backup!
    echo.
)

set /p CONFIRM="Deseja continuar? (digite 'SIM' para confirmar): "

if not "%CONFIRM%"=="SIM" (
    echo.
    echo ❌ Restore cancelado pelo usuário.
    pause
    exit /b 0
)

echo.
echo ========================================
echo 🚀 INICIANDO RESTORE...
echo ========================================
echo.

REM =============================================
REM EXECUTAR RESTORE CONFORME TIPO ESCOLHIDO
REM =============================================

if "%RESTORE_TYPE%"=="full" goto RESTORE_FULL
if "%RESTORE_TYPE%"=="structure" goto RESTORE_STRUCTURE
if "%RESTORE_TYPE%"=="data" goto RESTORE_DATA

REM =============================================
REM RESTORE FULL (Estrutura + Dados)
REM =============================================
:RESTORE_FULL

echo ╔════════════════════════════════════════════╗
echo ║   RESTORE COMPLETO (FULL)                  ║
echo ╚════════════════════════════════════════════╝
echo.

echo 📦 [1/2] Restaurando schema PUBLIC (completo)...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\meguispet_full_%TIMESTAMP%.sql" 2>restore_error.log
if %errorlevel% equ 0 (
    echo ✅ OK - Schema public restaurado
) else (
    echo ❌ ERRO ao restaurar schema public!
    echo 📄 Verifique: restore_error.log
    pause
    exit /b 1
)

echo.
echo 🔐 [2/2] Restaurando schema AUTH (completo)...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\auth_full_%TIMESTAMP%.sql" 2>restore_error.log
if %errorlevel% equ 0 (
    echo ✅ OK - Schema auth restaurado
) else (
    echo ❌ ERRO ao restaurar schema auth!
    echo 📄 Verifique: restore_error.log
    echo.
    echo ⚠️  Nota: Erros no schema auth podem ser normais se o Supabase
    echo    gerenciar permissões automaticamente. Verifique se os usuários
    echo    foram restaurados corretamente no Supabase Dashboard.
    echo.
    pause
)

goto RESTORE_COMPLETE

REM =============================================
REM RESTORE STRUCTURE (Apenas Estrutura)
REM =============================================
:RESTORE_STRUCTURE

echo ╔════════════════════════════════════════════╗
echo ║   RESTORE ESTRUTURA (STRUCTURE)            ║
echo ╚════════════════════════════════════════════╝
echo.

echo 🏗️  [1/2] Restaurando estrutura do schema PUBLIC...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\meguispet_structure_%TIMESTAMP%.sql" 2>restore_error.log
if %errorlevel% equ 0 (
    echo ✅ OK - Estrutura do schema public restaurada
) else (
    echo ❌ ERRO ao restaurar estrutura do schema public!
    echo 📄 Verifique: restore_error.log
    pause
    exit /b 1
)

echo.
echo 🏗️  [2/2] Restaurando estrutura do schema AUTH...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\auth_structure_%TIMESTAMP%.sql" 2>restore_error.log
if %errorlevel% equ 0 (
    echo ✅ OK - Estrutura do schema auth restaurada
) else (
    echo ❌ ERRO ao restaurar estrutura do schema auth!
    echo 📄 Verifique: restore_error.log
    echo.
    echo ⚠️  Nota: Erros no schema auth podem ser normais se o Supabase
    echo    gerenciar a estrutura automaticamente.
    echo.
    pause
)

goto RESTORE_COMPLETE

REM =============================================
REM RESTORE DATA (Apenas Dados)
REM =============================================
:RESTORE_DATA

echo ╔════════════════════════════════════════════╗
echo ║   RESTORE DADOS (DATA)                     ║
echo ╚════════════════════════════════════════════╝
echo.

echo 📊 [1/2] Restaurando dados do schema PUBLIC...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\meguispet_data_%TIMESTAMP%.sql" 2>restore_error.log
if %errorlevel% equ 0 (
    echo ✅ OK - Dados do schema public restaurados
) else (
    echo ❌ ERRO ao restaurar dados do schema public!
    echo 📄 Verifique: restore_error.log
    echo.
    echo 💡 Possíveis causas:
    echo    - Conflito de chaves primárias (dados já existem)
    echo    - Estrutura do banco incompatível com o backup
    echo    - Constraints de integridade referencial
    echo.
    pause
    exit /b 1
)

echo.
echo 📊 [2/2] Restaurando dados do schema AUTH...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_DIR%\auth_data_%TIMESTAMP%.sql" 2>restore_error.log
if %errorlevel% equ 0 (
    echo ✅ OK - Dados do schema auth restaurados
) else (
    echo ❌ ERRO ao restaurar dados do schema auth!
    echo 📄 Verifique: restore_error.log
    echo.
    echo ⚠️  Nota: Restaurar dados do schema auth pode invalidar sessões ativas.
    echo    Usuários podem precisar fazer login novamente.
    echo.
    pause
)

goto RESTORE_COMPLETE

REM =============================================
REM RESTORE CONCLUÍDO
REM =============================================
:RESTORE_COMPLETE

echo.
echo ========================================
echo 🎉 RESTORE CONCLUÍDO!
echo ========================================
echo 📅 Backup restaurado: %TIMESTAMP%
echo 🔄 Tipo: %RESTORE_TYPE%
echo 🌐 Destino: %DB_HOST% / %DB_NAME%
echo.

if "%RESTORE_TYPE%"=="full" (
    echo ✅ Schemas restaurados:
    echo    ✓ public (estrutura + dados)
    echo    ✓ auth (estrutura + dados)
)

if "%RESTORE_TYPE%"=="structure" (
    echo ✅ Estruturas restauradas:
    echo    ✓ public (tabelas, índices, constraints)
    echo    ✓ auth (tabelas, índices, constraints)
    echo.
    echo 💡 Próximo passo: Restaurar os dados
    echo    Execute: restore.bat %TIMESTAMP% data
)

if "%RESTORE_TYPE%"=="data" (
    echo ✅ Dados restaurados:
    echo    ✓ public (registros)
    echo    ✓ auth (usuários, sessões)
)

echo.
echo ========================================
echo 🔍 PRÓXIMOS PASSOS - VALIDAÇÃO
echo ========================================
echo.
echo 1. Verificar contagem de registros nas tabelas principais
echo 2. Testar login de usuários
echo 3. Verificar integridade referencial
echo 4. Executar queries de validação
echo 5. Monitorar logs da aplicação
echo.

if "%RESTORE_TYPE%"=="full" (
    echo ⚠️  ATENÇÃO: Se restaurou schema auth
    echo    - Usuários podem precisar fazer logout/login
    echo    - Tokens de autenticação podem ter sido invalidados
    echo    - Verifique o Supabase Dashboard para confirmar usuários
    echo.
)

echo 📄 Log de erros (se houver): restore_error.log
echo.
pause
exit /b 0
