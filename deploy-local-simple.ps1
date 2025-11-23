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

# 1. Compilar localmente
Write-Host ""
Write-Host "1. Compilando frontend localmente..." -ForegroundColor Cyan
Write-Host "   (Esto puede tardar unos minutos)" -ForegroundColor Gray

npm run build

if (-not (Test-Path "dist")) {
    Write-Host "ERROR: El build fallo. No se genero la carpeta dist/" -ForegroundColor Red
    exit 1
}

Write-Host "   OK: Build completado" -ForegroundColor Green

# 2. Subir dist/ al VPS
Write-Host ""
Write-Host "2. Subiendo dist/ al VPS..." -ForegroundColor Cyan
Write-Host "   Destino: $VPS_PATH/dist/" -ForegroundColor Gray
Write-Host "   (Se te pedira la contrasena de $VPS_USER)" -ForegroundColor Yellow
Write-Host ""

# Comprimir dist/ para subir más rápido
$tempDir = [System.IO.Path]::GetTempPath()
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$distArchive = Join-Path $tempDir "flowspace-dist-$timestamp.zip"

try {
    Write-Host "   Comprimiendo dist/..." -ForegroundColor Gray
    # IMPORTANTE: Comprimir el CONTENIDO de dist/, no dist/ mismo
    # Usar -Path "dist\*" pero cambiar al directorio dist para que la estructura sea correcta
    Push-Location dist
    Compress-Archive -Path "*" -DestinationPath $distArchive -Force
    Pop-Location
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

# 3. Ajustar permisos
Write-Host ""
Write-Host "3. Ajustando permisos..." -ForegroundColor Cyan
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

