@echo off
REM Wrapper para o restore do Supabase via PowerShell.
REM Uso: pnpm db:restore -- <label> [full^|structure^|data]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restore-supabase.ps1" %*
