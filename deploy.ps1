# Deployment script for Murcia Welcomes You
# This script uploads files and restarts the server

$server = "u982855093@145.223.34.110"
$remotePath = "/var/www/murcia-welcomes-you"
$localPath = "c:\Users\hola\Servidor Web\GitHub\murcia-welcomes-you"

Write-Host "=== Murcia Welcomes You - Automatic Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Create a temporary directory list file
$filesToUpload = @(
    "public",
    "views", 
    "server.js",
    "package.json",
    "data",
    "Caddyfile"
)

Write-Host "Step 1: Uploading files to server..." -ForegroundColor Yellow
Write-Host "You will be prompted for your SSH password for each upload."
Write-Host ""

foreach ($item in $filesToUpload) {
    $itemPath = Join-Path $localPath $item
    if (Test-Path $itemPath) {
        Write-Host "  Uploading $item..." -ForegroundColor Green
        if (Test-Path $itemPath -PathType Container) {
            # It's a directory
            & scp -r "$itemPath" "${server}:${remotePath}/"
        }
        else {
            # It's a file
            & scp "$itemPath" "${server}:${remotePath}/"
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ Failed to upload $item" -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host "  ⚠️  Skipping $item (not found)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Step 2: Installing dependencies and restarting server..." -ForegroundColor Yellow
Write-Host ""

# SSH into server and run commands
$sshCommands = @"
cd $remotePath
npm install --production
pm2 restart mwy-2026 || pm2 start server.js --name mwy-2026
pm2 save
echo ""
echo "✅ Deployment complete!"
"@

$sshCommands | ssh $server "bash -s"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Your website is now live at:" -ForegroundColor Cyan
    Write-Host "  https://murciawelcomesyou.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Wait 30 seconds and refresh to see changes." -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the errors above." -ForegroundColor Red
    exit 1
}
