# Script de deploy local SIMPLE - Compila localmente y sube solo dist/
# Uso: .\deploy-local-simple.ps1
# NO modifica el proyecto, solo compila y sube dist/

$VPS_USER = "root"
$VPS_HOST = "186.64.113.155"
$VPS_PORT = "49807"
$VPS_PATH = "/var/www/flowspace"

Write-Host "Deploy Local Simple - FlowSpace" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Este script:" -ForegroundColor Cyan
Write-Host "  1. Compila el frontend localmente (en tu PC)" -ForegroundColor Gray
Write-Host "  2. Sube solo la carpeta dist/ al VPS" -ForegroundColor Gray
Write-Host "  3. NO modifica el codigo en el VPS" -ForegroundColor Gray
Write-Host "  4. NO afecta el backend ni otras partes" -ForegroundColor Gray
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: No se encontro package.json. Ejecuta desde la raiz del proyecto." -ForegroundColor Red
    exit 1
}

# Verificar que dist/ no existe o está vacío (para evitar confusiones)
if (Test-Path "dist") {
    Write-Host "ADVERTENCIA: La carpeta dist/ ya existe localmente" -ForegroundColor Yellow
    Write-Host "Se reemplazara con el nuevo build" -ForegroundColor Yellow
    Write-Host ""
}

$confirm = Read-Host "¿Continuar? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Deploy cancelado" -ForegroundColor Yellow
    exit 1
}

# 1. Verificar e instalar dependencias si es necesario
Write-Host ""
Write-Host "1. Verificando dependencias..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "   Instalando dependencias (primera vez)..." -ForegroundColor Yellow
    npm install
} elseif (-not (Test-Path "node_modules/vite")) {
    Write-Host "   Vite no encontrado, reinstalando dependencias..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "   OK: Dependencias ya instaladas" -ForegroundColor Gray
}

# 2. Compilar localmente
Write-Host ""
Write-Host "2. Compilando frontend localmente..." -ForegroundColor Cyan
Write-Host "   (Esto puede tardar unos minutos)" -ForegroundColor Gray

# Usar npm run build que ejecuta el script de package.json
$buildResult = npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ERROR: El build fallo" -ForegroundColor Red
    $buildResult | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkRed }
    Write-Host ""
    Write-Host "   Intentando con npx vite build..." -ForegroundColor Yellow
    npx vite build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ERROR: Build fallo completamente" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   OK: Build completado" -ForegroundColor Green
}

if (-not (Test-Path "dist")) {
    Write-Host "ERROR: El build fallo. No se genero la carpeta dist/" -ForegroundColor Red
    exit 1
}

Write-Host "   OK: Build completado" -ForegroundColor Green

# 3. Subir dist/ al VPS
Write-Host ""
Write-Host "3. Subiendo dist/ al VPS..." -ForegroundColor Cyan
Write-Host "   Destino: $VPS_PATH/dist/" -ForegroundColor Gray
Write-Host "   (Se te pedira la contrasena de $VPS_USER)" -ForegroundColor Yellow
Write-Host ""

# Comprimir dist/ para subir más rápido
$tempDir = [System.IO.Path]::GetTempPath()
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$distArchive = Join-Path $tempDir "flowspace-dist-$timestamp.zip"

try {
    Write-Host "   Comprimiendo dist/ con Python (preserva estructura correcta)..." -ForegroundColor Gray
    # Usar Python para crear el zip y preservar correctamente la estructura de carpetas
    $pythonZipScript = @"
import zipfile
import os
import sys

dist_path = 'dist'
zip_path = r'$distArchive'

try:
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(dist_path):
            for file in files:
                file_path = os.path.join(root, file)
                # Obtener ruta relativa y normalizar a forward slashes
                arcname = os.path.relpath(file_path, dist_path).replace('\\', '/')
                zipf.write(file_path, arcname)
    
    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f'OK: Zip creado correctamente ({size_mb:.2f} MB)')
except Exception as e:
    print(f'Error creando zip: {e}')
    sys.exit(1)
"@
    $tempPythonZip = Join-Path $tempDir "create_zip_$timestamp.py"
    $pythonZipScript | Out-File -FilePath $tempPythonZip -Encoding utf8 -NoNewline
    python $tempPythonZip
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ERROR: Fallo al crear zip con Python" -ForegroundColor Red
        Write-Host "   Intentando con Compress-Archive como fallback..." -ForegroundColor Yellow
        Compress-Archive -Path "dist\*" -DestinationPath $distArchive -Force
    }
    Remove-Item $tempPythonZip -Force -ErrorAction SilentlyContinue
    $distSize = (Get-Item $distArchive).Length / 1MB
    Write-Host "   Archivo comprimido: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray

    # Subir archivo comprimido
    Write-Host "   Subiendo archivo comprimido..." -ForegroundColor Gray
    $remoteArchive = "/tmp/flowspace-dist-$timestamp.zip"
    scp -P $VPS_PORT $distArchive "${VPS_USER}@${VPS_HOST}:$remoteArchive"

    # Descomprimir en el VPS usando Python
    Write-Host "   Descomprimiendo en el VPS..." -ForegroundColor Gray
    $pythonScript = @"
import zipfile, os, sys, shutil
try:
    z = zipfile.ZipFile('$remoteArchive')
    
    # Limpiar dist/ completamente antes de extraer
    if os.path.exists('$VPS_PATH/dist'):
        shutil.rmtree('$VPS_PATH/dist')
    os.makedirs('$VPS_PATH/dist', exist_ok=True)
    
    # Extraer todos los archivos directamente en dist/
    z.extractall('$VPS_PATH/dist')
    z.close()
    os.remove('$remoteArchive')
    
    # Verificar que assets/ existe
    assets_path = os.path.join('$VPS_PATH/dist', 'assets')
    if os.path.exists(assets_path):
        asset_count = len(os.listdir(assets_path))
        print(f'OK: Frontend actualizado correctamente. Assets encontrados: {asset_count} archivos')
    else:
        print('ADVERTENCIA: Carpeta assets/ no encontrada despues de extraer')
        # Listar lo que hay en dist/
        dist_content = os.listdir('$VPS_PATH/dist')
        print(f'Contenido de dist/: {dist_content}')
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
    sys.exit(1)
"@
    $tempPythonScript = "/tmp/unzip_dist_$timestamp.py"
    $pythonScript | ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "cat > $tempPythonScript && python3 $tempPythonScript && rm $tempPythonScript"

    Write-Host "   OK: Frontend subido y descomprimido" -ForegroundColor Green

} finally {
    # Limpiar archivo temporal local
    if (Test-Path $distArchive) { Remove-Item $distArchive -Force -ErrorAction SilentlyContinue }
}

# 4. Ajustar permisos
Write-Host ""
Write-Host "4. Ajustando permisos..." -ForegroundColor Cyan
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "chmod -R 755 $VPS_PATH/dist && chown -R www-data:www-data $VPS_PATH/dist"
Write-Host "   OK: Permisos ajustados" -ForegroundColor Green

Write-Host ""
Write-Host "Deploy completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Resumen:" -ForegroundColor Green
Write-Host "   - Frontend compilado localmente" -ForegroundColor Gray
Write-Host "   - Archivos subidos a: $VPS_PATH/dist/" -ForegroundColor Gray
Write-Host "   - Backend y codigo NO fueron modificados" -ForegroundColor Gray
Write-Host ""
Write-Host "La aplicacion deberia estar actualizada en:" -ForegroundColor Yellow
Write-Host "   https://flowspace.farmavet-bodega.cl" -ForegroundColor Cyan

