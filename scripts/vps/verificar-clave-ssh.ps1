# Script para verificar y agregar clave SSH en Windows
# Ejecuta este script en PowerShell

Write-Host "🔑 Verificando clave SSH..." -ForegroundColor Yellow

# Obtener la clave pública
$pubkeyPath = "$env:USERPROFILE\.ssh\id_ed25519.pub"
if (-not (Test-Path $pubkeyPath)) {
    Write-Host "❌ No se encontró la clave pública en: $pubkeyPath" -ForegroundColor Red
    exit 1
}

$pubkey = Get-Content $pubkeyPath
Write-Host "✅ Clave pública encontrada:" -ForegroundColor Green
Write-Host $pubkey -ForegroundColor Cyan
Write-Host ""

Write-Host "📤 Copiando clave al VPS..." -ForegroundColor Yellow
Write-Host "   (Se te pedirá la contraseña una vez)" -ForegroundColor Gray
Write-Host ""

# Comando para agregar la clave
$command = @"
mkdir -p ~/.ssh && 
echo '$pubkey' >> ~/.ssh/authorized_keys && 
chmod 700 ~/.ssh && 
chmod 600 ~/.ssh/authorized_keys && 
echo '✅ Clave SSH agregada correctamente'
"@

ssh -p 49807 flowspace@186.64.113.155 $command

Write-Host ""
Write-Host "🧪 Probando conexión sin contraseña..." -ForegroundColor Yellow
ssh -p 49807 flowspace@186.64.113.155 "echo '✅ Conexión exitosa sin contraseña!'"






