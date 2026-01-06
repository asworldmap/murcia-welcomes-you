#!/bin/bash
# Quick deployment script - run this on your LOCAL machine

echo "=== Murcia Welcomes You - Manual Deployment ==="
echo ""
echo "Uploading files to server..."

# Upload all files via SCP
scp -r public views server.js package.json data u982855093@145.223.34.110:/var/www/murcia-welcomes-you/

echo ""
echo "Files uploaded! Now connecting to server to restart..."
echo ""

# SSH into server and restart
ssh u982855093@145.223.34.110 << 'ENDSSH'
cd /var/www/murcia-welcomes-you
npm install
pm2 restart mwy-2026 || pm2 start server.js --name mwy-2026
echo "Deployment complete!"
ENDSSH

echo ""
echo "✅ Done! Visit https://murciawelcomesyou.com in 30 seconds"
