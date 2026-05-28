Write-Host "Iniciando Backend de Contabilidad Arturo en modo Desarrollo..." -ForegroundColor Cyan
uvicorn main:app --reload --port 8000 --host 0.0.0.0
