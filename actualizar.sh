#!/bin/bash
# Sistema de actualización automática - Murcia Welcomes You V2.0

echo "--- 📥 Bajando últimas actualizaciones desde GitHub ---"
git pull origin main

echo "--- 📦 Instalando dependencias ---"
npm install --production

echo "--- 🔄 Reiniciando servidor PM2 ---"
pm2 restart murcia-3002 --update-env || pm2 start server.js --name murcia-3002

echo "--- ✅ ¡Todo listo! Web actualizada y funcionando ---"
