# Script para solucionar problemas en el VPS despues del reset
# Uso: .\solucionar-vps.ps1

$VPS_USER = "root"
$VPS_HOST = "186.64.113.155"
$VPS_PORT = "49807"
$VPS_PATH = "/var/www/flowspace"

Write-Host "Solucionando problemas en el VPS" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Verificando estado del repositorio..." -ForegroundColor Cyan
$gitStatus = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git status"
Write-Host "   Estado:" -ForegroundColor Gray
$gitStatus -split "`n" | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "2. Restaurando archivos del repositorio..." -ForegroundColor Cyan
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git checkout ."
Write-Host "   OK: Archivos del repositorio restaurados" -ForegroundColor Green

Write-Host ""
Write-Host "3. Verificando que backend/ existe..." -ForegroundColor Cyan
$backendExists = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "test -d $VPS_PATH/backend && echo 'existe' || echo 'no existe'"
if ($backendExists -match "existe") {
    Write-Host "   OK: Directorio backend/ existe" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Directorio backend/ NO existe" -ForegroundColor Red
    Write-Host "   Necesitas restaurarlo desde el repositorio" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "4. Ajustando permisos para que flowspace pueda escribir..." -ForegroundColor Cyan
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" @"
# Dar permisos de escritura al usuario flowspace
sudo chown -R flowspace:flowspace $VPS_PATH
sudo chmod -R 755 $VPS_PATH

# Asegurar que dist/ tenga permisos correctos
sudo mkdir -p $VPS_PATH/dist
sudo chown -R flowspace:flowspace $VPS_PATH/dist
sudo chmod -R 755 $VPS_PATH/dist
"@
Write-Host "   OK: Permisos ajustados" -ForegroundColor Green

Write-Host ""
Write-Host "5. Verificando permisos..." -ForegroundColor Cyan
$permissions = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "ls -ld $VPS_PATH $VPS_PATH/dist 2>/dev/null"
Write-Host "   Permisos:" -ForegroundColor Gray
$permissions -split "`n" | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "Solucion completada" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes:" -ForegroundColor Yellow
Write-Host "   1. Conectarte como flowspace: ssh -p $VPS_PORT flowspace@$VPS_HOST" -ForegroundColor Gray
Write-Host "   2. Ir al directorio: cd $VPS_PATH" -ForegroundColor Gray
Write-Host "   3. Instalar dependencias: npm install" -ForegroundColor Gray
Write-Host "   4. Hacer build: npm run build" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTA: Si backend/ no existe, necesitas clonar o restaurar el repositorio completo" -ForegroundColor Yellow



