# Script para verificar el estado del deploy
# Uso: .\verificar-deploy.ps1

$VPS_USER = "root"
$VPS_HOST = "186.64.113.155"
$VPS_PORT = "49807"
$VPS_PATH = "/var/www/flowspace"

Write-Host "Verificando estado del deploy..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
Write-Host ""

# 1. Verificar que dist/ existe
Write-Host "1. Verificando directorio dist/..." -ForegroundColor Cyan
$distExists = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "test -d $VPS_PATH/dist && echo 'existe' || echo 'no existe'"
if ($distExists -match "existe") {
    Write-Host "   OK: Directorio dist/ existe" -ForegroundColor Green
    
    # Contar archivos
    $fileCount = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "find $VPS_PATH/dist -type f | wc -l"
    Write-Host "   Archivos encontrados: $fileCount" -ForegroundColor Gray
    
    # Verificar index.html
    $indexExists = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "test -f $VPS_PATH/dist/index.html && echo 'existe' || echo 'no existe'"
    if ($indexExists -match "existe") {
        Write-Host "   OK: index.html existe" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: index.html NO existe" -ForegroundColor Red
    }
    
    # Verificar carpeta assets/
    $assetsExists = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "test -d $VPS_PATH/dist/assets && echo 'existe' || echo 'no existe'"
    if ($assetsExists -match "existe") {
        Write-Host "   OK: assets/ existe" -ForegroundColor Green
        
        # Listar algunos archivos en assets/
        $assetFiles = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "ls -1 $VPS_PATH/dist/assets | head -5"
        Write-Host "   Archivos en assets/:" -ForegroundColor Gray
        $assetFiles -split "`n" | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
    } else {
        Write-Host "   ERROR: assets/ NO existe" -ForegroundColor Red
    }
} else {
    Write-Host "   ERROR: Directorio dist/ NO existe" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar permisos
Write-Host "2. Verificando permisos..." -ForegroundColor Cyan
$permissions = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "ls -ld $VPS_PATH/dist 2>/dev/null"
Write-Host "   Permisos: $permissions" -ForegroundColor Gray

# Verificar permisos de archivos dentro de dist/
$filePerms = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "ls -l $VPS_PATH/dist/index.html 2>/dev/null | head -1"
if ($filePerms) {
    Write-Host "   Permisos de index.html: $filePerms" -ForegroundColor Gray
}

Write-Host ""

# 3. Verificar configuración de Nginx
Write-Host "3. Verificando configuracion de Nginx..." -ForegroundColor Cyan
$nginxRoot = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "grep -r 'root.*flowspace' /etc/nginx/sites-enabled/ 2>/dev/null | grep -v '#' | head -1"
if ($nginxRoot) {
    Write-Host "   Configuracion encontrada:" -ForegroundColor Green
    Write-Host "      $nginxRoot" -ForegroundColor DarkGray
} else {
    Write-Host "   ADVERTENCIA: No se encontro configuracion de Nginx para flowspace" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar que Nginx puede leer los archivos
Write-Host "4. Verificando acceso de Nginx..." -ForegroundColor Cyan
$nginxUser = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "ps aux | grep nginx | grep -v grep | head -1 | awk '{print \$1}'"
if ($nginxUser) {
    Write-Host "   Usuario de Nginx: $nginxUser" -ForegroundColor Gray
    
    # Verificar si puede leer index.html
    $canRead = ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "sudo -u $nginxUser test -r $VPS_PATH/dist/index.html && echo 'puede leer' || echo 'NO puede leer'"
    if ($canRead -match "puede leer") {
        Write-Host "   OK: Nginx puede leer los archivos" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Nginx NO puede leer los archivos" -ForegroundColor Red
        Write-Host "   Solucion: sudo chown -R www-data:www-data $VPS_PATH/dist" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Diagnostico completado" -ForegroundColor Green






