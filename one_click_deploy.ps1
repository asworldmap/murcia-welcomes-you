Write-Host "🚀 Enviando Web a Producción..." -ForegroundColor Cyan

$server = "u982855093@145.223.34.110"
$dest = "/var/www/murcia-welcomes-you"

# 1. Upload Critical Files (optimized to be faster)
# We group them to ask for password fewer times if possible, though scp usually asks per command
Write-Host "📂 Subiendo archivos..." -ForegroundColor Yellow
scp -r server.js package.json views public data $server:$dest

# 2. Restart Server
Write-Host "🔄 Reiniciando Servidor..." -ForegroundColor Yellow
ssh $server "cd $dest && npm install --production && pm2 restart mwy-2026 --update-env || pm2 start server.js --name mwy-2026 && sudo systemctl restart caddy"

Write-Host "✅ ¡Listo! Web actualizada." -ForegroundColor Green
Write-Host "👉 https://murciawelcomesyou.com" -ForegroundColor Cyan
