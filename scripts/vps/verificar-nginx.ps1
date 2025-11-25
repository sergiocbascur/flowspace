# Script para verificar y corregir configuracion de Nginx
# Uso: .\verificar-nginx.ps1

$VPS_USER = "root"
$VPS_HOST = "186.64.113.155"
$VPS_PORT = "49807"
$VPS_PATH = "/var/www/flowspace"

Write-Host "Verificando configuracion de Nginx..." -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host ""

# 1. Ver contenido de la configuracion
Write-Host "1. Contenido de la configuracion de Nginx:" -ForegroundColor Cyan
$nginxConfig = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cat /etc/nginx/sites-available/flowspace"
Write-Host ""
$nginxConfig -split "`n" | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }

Write-Host ""

# 2. Verificar que apunta a la ruta correcta
Write-Host "2. Verificando ruta configurada..." -ForegroundColor Cyan
$rootPath = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "grep -i 'root' /etc/nginx/sites-available/flowspace | grep -v '#' | head -1"
if ($rootPath) {
    Write-Host "   Ruta configurada: $rootPath" -ForegroundColor Gray
    
    if ($rootPath -match $VPS_PATH) {
        Write-Host "   OK: Apunta a la ruta correcta" -ForegroundColor Green
    } else {
        Write-Host "   ADVERTENCIA: No apunta a $VPS_PATH/dist" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ERROR: No se encontro directiva 'root'" -ForegroundColor Red
}

Write-Host ""

# 3. Verificar que Nginx puede leer la configuracion
Write-Host "3. Verificando sintaxis de Nginx..." -ForegroundColor Cyan
$nginxTest = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "sudo nginx -t 2>&1"
if ($nginxTest -match "syntax is ok" -and $nginxTest -match "test is successful") {
    Write-Host "   OK: Configuracion de Nginx es valida" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Configuracion tiene problemas" -ForegroundColor Red
    $nginxTest -split "`n" | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
}

Write-Host ""

# 4. Verificar estado de Nginx
Write-Host "4. Estado de Nginx..." -ForegroundColor Cyan
$nginxStatus = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "systemctl is-active nginx 2>/dev/null || echo 'inactivo'"
if ($nginxStatus -match "active") {
    Write-Host "   OK: Nginx esta activo" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Nginx NO esta activo" -ForegroundColor Red
}

Write-Host ""
Write-Host "Si la configuracion no apunta a $VPS_PATH/dist, necesitas corregirla" -ForegroundColor Yellow






