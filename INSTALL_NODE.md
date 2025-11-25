# Instalación de Node.js en el VPS

Si `npm` no está instalado, aquí tienes las opciones para instalar Node.js.

## 🚀 Opción 1: NodeSource (Recomendado - Versión LTS)

Esta es la mejor opción para obtener la versión más reciente de Node.js LTS.

```bash
# Como usuario flowspace o con sudo
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

## 🔧 Opción 2: NVM (Node Version Manager)

NVM te permite instalar y cambiar entre versiones de Node.js fácilmente.

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recargar shell
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts
nvm alias default node

# Verificar
node --version
npm --version
```

## 📦 Opción 3: APT (Versión del repositorio - Puede ser antigua)

```bash
sudo apt update
sudo apt install -y nodejs npm

# Verificar versión (puede ser antigua)
node --version
npm --version
```

## ✅ Verificación

Después de instalar, verifica:

```bash
node --version  # Debería mostrar v18.x.x o superior
npm --version   # Debería mostrar 9.x.x o superior
```

## 🔄 Continuar con la Instalación

Una vez Node.js esté instalado:

```bash
# Como usuario flowspace
cd /var/www/flowspace

# Instalar dependencias del frontend
npm install

# Instalar dependencias del backend
cd backend
npm install
cd ..
```

## 🐛 Troubleshooting

### Problema: "npm: command not found" después de instalar

```bash
# Recargar el shell
source ~/.bashrc
# O cerrar y abrir nueva sesión SSH
```

### Problema: Permisos con npm global

Si necesitas instalar paquetes globales (como PM2):

```bash
# Configurar npm para no usar sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Problema: Versión muy antigua de Node.js

Si instalaste con `apt install npm` y la versión es muy antigua:

```bash
# Desinstalar versión antigua
sudo apt remove nodejs npm

# Instalar con NodeSource (Opción 1)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```








