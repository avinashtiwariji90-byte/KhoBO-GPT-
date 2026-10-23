@echo off
title ORA GPT - Launching Full-Stack AI Platform
color 0B

echo ===================================================
echo             ORA GPT ENTERPRISE PLATFORM
echo ===================================================
echo [1/3] Initializing Backend (FastAPI on Port 8001)...
start "ORA GPT - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload"

echo [2/3] Initializing Frontend (Next.js on Port 3000)...
start "ORA GPT - Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Opening ORA GPT in your default web browser...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo ===================================================
echo   ORA GPT is now running!
echo   Frontend : http://localhost:3000
echo   Backend  : http://127.0.0.1:8001
echo   API Docs : http://127.0.0.1:8001/docs
echo.
echo   Demo Accounts for One-Click Login:
echo   - Admin    : admin@oragpt.ai   / Admin@123
echo   - Business : business@oragpt.ai / Business@123
echo   - User     : user@oragpt.ai    / User@123
echo ===================================================
pause
