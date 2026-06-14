@echo off
REM Wrapper para o backup do Supabase via PowerShell.
REM Uso: pnpm db:backup   /   pnpm db:backup -- <label>
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0backup-supabase.ps1" %*
