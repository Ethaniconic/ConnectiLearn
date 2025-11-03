# ConnectiLearn Startup Script
# Run this script to start both backend and frontend servers

Write-Host "🚀 Starting ConnectiLearn..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check if backend virtual environment exists
if (-not (Test-Path "$ScriptDir\backend\venv")) {
    Write-Host "❌ Backend virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run setup first:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Yellow
    Write-Host "  python -m venv venv" -ForegroundColor Yellow
    Write-Host "  .\venv\Scripts\activate" -ForegroundColor Yellow
    Write-Host "  pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Check if frontend node_modules exists
if (-not (Test-Path "$ScriptDir\frontend\node_modules")) {
    Write-Host "❌ Frontend dependencies not installed!" -ForegroundColor Red
    Write-Host "Please run:" -ForegroundColor Yellow
    Write-Host "  cd frontend" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Starting Backend Server..." -ForegroundColor Green
$backendCmd = "Set-Location '$ScriptDir\backend'; & '$ScriptDir\backend\venv\Scripts\python.exe' -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3

Write-Host "✅ Starting Frontend Server..." -ForegroundColor Green
$frontendCmd = "Set-Location '$ScriptDir\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "🎉 ConnectiLearn is starting!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Note: Make sure to add your OPENAI_API_KEY to backend\.env file" -ForegroundColor Yellow
