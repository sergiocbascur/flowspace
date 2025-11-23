# Script para restaurar el VPS a la version f907c08
# Uso: .\restaurar-vps.ps1

$VPS_USER = "root"
$VPS_HOST = "186.64.113.155"
$VPS_PORT = "49807"
$VPS_PATH = "/var/www/flowspace"
$COMMIT = "f907c08"

Write-Host "Restaurando VPS a la version $COMMIT" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Guardando cambios locales (si existen)..." -ForegroundColor Cyan
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git stash push -m 'Cambios antes de restaurar a $COMMIT'"

Write-Host ""
Write-Host "2. Obteniendo ultimos cambios de GitHub..." -ForegroundColor Cyan
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git fetch origin"

Write-Host ""
Write-Host "3. Restaurando a la version $COMMIT..." -ForegroundColor Cyan
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git reset --hard $COMMIT"

Write-Host ""
Write-Host "4. Verificando version actual..." -ForegroundColor Cyan
$currentCommit = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git rev-parse HEAD"
$currentCommitShort = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git rev-parse --short HEAD"
Write-Host "   Commit actual: $currentCommitShort" -ForegroundColor Gray

if ($currentCommit -match $COMMIT) {
    Write-Host "   OK: VPS restaurado correctamente a $COMMIT" -ForegroundColor Green
} else {
    Write-Host "   ADVERTENCIA: El commit no coincide exactamente" -ForegroundColor Yellow
    Write-Host "   Esperado: $COMMIT" -ForegroundColor Gray
    Write-Host "   Obtenido: $currentCommitShort" -ForegroundColor Gray
}

Write-Host ""
Write-Host "5. Limpiando archivos no rastreados (opcional)..." -ForegroundColor Cyan
Write-Host "   (Esto eliminara archivos que no estan en el repositorio)" -ForegroundColor Yellow
$clean = Read-Host "¿Limpiar archivos no rastreados? (s/N)"
if ($clean -eq "s" -or $clean -eq "S") {
    ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cd $VPS_PATH && git clean -fd"
    Write-Host "   OK: Archivos no rastreados eliminados" -ForegroundColor Green
} else {
    Write-Host "   Saltado: Archivos no rastreados conservados" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Restauracion completada" -ForegroundColor Green
Write-Host ""
Write-Host "NOTA: Si necesitas reconstruir el frontend:" -ForegroundColor Yellow
Write-Host "   cd $VPS_PATH" -ForegroundColor Gray
Write-Host "   npm install" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray



