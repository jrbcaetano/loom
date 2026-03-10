@echo off
setlocal

REM Stable wrapper to avoid quote issues in direct PowerShell invocations.
npm run build:client
set EXIT_CODE=%ERRORLEVEL%

exit /b %EXIT_CODE%
