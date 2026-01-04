@echo off
echo Deploying SSL fix to server...
echo.

REM Create temporary Caddyfile
echo murciawelcomesyou.com, www.murciawelcomesyou.com { > temp_caddyfile.txt
echo   reverse_proxy localhost:3000 >> temp_caddyfile.txt
echo } >> temp_caddyfile.txt
echo dataspider.asensios.com { >> temp_caddyfile.txt
echo   root * /var/www/dataspider >> temp_caddyfile.txt
echo   file_server >> temp_caddyfile.txt
echo } >> temp_caddyfile.txt

echo Step 1: Backing up current Caddyfile...
echo Spiderweb2025. | ssh u982855093@145.223.34.110 "sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup"

echo.
echo Step 2: Uploading new Caddyfile...
type temp_caddyfile.txt | ssh u982855093@145.223.34.110 "cat | sudo tee /etc/caddy/Caddyfile"

echo.
echo Step 3: Restarting Caddy...
echo Spiderweb2025. | ssh u982855093@145.223.34.110 "sudo systemctl restart caddy"

echo.
echo Step 4: Checking Caddy status...
echo Spiderweb2025. | ssh u982855093@145.223.34.110 "sudo systemctl status caddy | head -n 20"

del temp_caddyfile.txt

echo.
echo ========================================
echo SSL fix deployed successfully!
echo ========================================
echo.
echo Wait 1-2 minutes for SSL certificates to be provisioned.
echo Then visit: https://murciawelcomesyou.com
echo.
pause
