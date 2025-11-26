# ✅ Checklist de Migración VPS

Usa este checklist para asegurarte de que no falte nada durante la migración.

## 📋 Antes de Empezar

- [ ] **IP del nuevo VPS**: `_________________`
- [ ] **Usuario SSH**: `_________________`
- [ ] **Dominio Trabajo**: `_________________`
- [ ] **Dominio API**: `_________________`
- [ ] **Dominio Personal**: `_________________`
- [ ] **Password PostgreSQL**: `_________________`
- [ ] **JWT_SECRET**: `_________________`

## 🔧 Preparación VPS

- [ ] VPS creado con Ubuntu 24.04 LTS
- [ ] Acceso SSH funcionando
- [ ] Sistema actualizado (`apt update && apt upgrade`)
- [ ] Dependencias instaladas (nodejs, npm, postgresql, nginx, git, certbot)
- [ ] Firewall configurado (puertos 22, 80, 443)

## 🗄️ Base de Datos

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `flowspace` creada
- [ ] Usuario `flowspace_user` creado
- [ ] Permisos configurados
- [ ] (Si migras) Backup del VPS actual descargado
- [ ] (Si migras) Datos restaurados en nuevo VPS

## 📦 Proyecto

- [ ] Repositorio clonado en `/var/www/flowspace`
- [ ] Permisos correctos (`chown -R usuario:usuario`)
- [ ] Backend `.env` creado y configurado
- [ ] Frontend `.env` creado y configurado
- [ ] Dependencias backend instaladas (`npm install` en `backend/`)
- [ ] Dependencias frontend instaladas (`npm install` en raíz)
- [ ] Frontend construido (`npm run build`)

## ⚙️ PM2

- [ ] PM2 instalado globalmente
- [ ] Backend iniciado con PM2
- [ ] PM2 guardado (`pm2 save`)
- [ ] PM2 startup configurado
- [ ] Backend responde en `http://localhost:3000/health`

## 🌐 Nginx

- [ ] Configuración creada en `/etc/nginx/sites-available/flowspace`
- [ ] Enlace simbólico creado en `sites-enabled`
- [ ] Configuración verificada (`nginx -t`)
- [ ] Nginx reiniciado
- [ ] Nginx corriendo (`systemctl status nginx`)

## 🔐 DNS

- [ ] Registro A para dominio Trabajo creado
- [ ] Registro A para dominio API creado
- [ ] Registro A para dominio Personal creado
- [ ] DNS propagado (verificar con `nslookup` o `dig`)

## 🔒 SSL

- [ ] Certbot instalado
- [ ] Certificados SSL obtenidos para los 3 dominios
- [ ] Nginx configurado automáticamente por Certbot
- [ ] Redirección HTTP → HTTPS funcionando

## ✅ Verificación

- [ ] `https://flowspace.empresa.com` carga correctamente
- [ ] `https://vida.tudominio.com` carga correctamente
- [ ] `https://api.empresa.com/health` responde `{"status":"ok"}`
- [ ] Login funciona en dominio Trabajo
- [ ] Login funciona en dominio Personal
- [ ] WebSocket conecta correctamente
- [ ] QR Scanner funciona
- [ ] Notas rápidas funcionan
- [ ] Recursos se cargan correctamente

## 🔄 Post-Migración

- [ ] Script de deploy probado (`./scripts/deploy/deploy.sh`)
- [ ] Backups de PostgreSQL configurados
- [ ] Monitoreo con PM2 configurado
- [ ] Logs verificados (`pm2 logs`, `tail -f /var/log/nginx/error.log`)
- [ ] VPS antiguo apagado o en modo backup

## 📝 Notas

```
Fecha de migración: _________________
VPS antiguo: _________________
VPS nuevo: _________________
Observaciones: 




```

