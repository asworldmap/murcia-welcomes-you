# PowerShell script to deploy SSL fix to server
$password = ConvertTo-SecureString "Spiderweb2025." -AsPlainText -Force
$username = "u982855093"
$server = "145.223.34.110"

# Create credential object
$credential = New-Object System.Management.Automation.PSCredential ($username, $password)

# New Caddyfile content
$caddyfileContent = @"
murciawelcomesyou.com, www.murciawelcomesyou.com {
  reverse_proxy localhost:3000
}
dataspider.asensios.com {
  root * /var/www/dataspider
  file_server
}
"@

Write-Host "Connecting to server..."
Write-Host "This script requires Posh-SSH module. Installing if not present..."

# Install Posh-SSH if not available
if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-Module -Name Posh-SSH -Force -Scope CurrentUser
}

Import-Module Posh-SSH

try {
    # Create SSH session
    $session = New-SSHSession -ComputerName $server -Credential $credential -AcceptKey
    
    # Check current Caddyfile
    Write-Host "Checking current Caddyfile..."
    $result = Invoke-SSHCommand -SessionId $session.SessionId -Command "cat /etc/caddy/Caddyfile"
    Write-Host "Current Caddyfile:"
    Write-Host $result.Output
    
    # Backup current Caddyfile
    Write-Host "`nBacking up current Caddyfile..."
    Invoke-SSHCommand -SessionId $session.SessionId -Command "sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%s)"
    
    # Update Caddyfile
    Write-Host "`nUpdating Caddyfile..."
    $escapedContent = $caddyfileContent -replace '"', '\"'
    Invoke-SSHCommand -SessionId $session.SessionId -Command "echo '$escapedContent' | sudo tee /etc/caddy/Caddyfile"
    
    # Restart Caddy
    Write-Host "`nRestarting Caddy..."
    $restartResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "sudo systemctl restart caddy"
    
    # Check Caddy status
    Write-Host "`nChecking Caddy status..."
    $statusResult = Invoke-SSHCommand -SessionId $session.SessionId -Command "sudo systemctl status caddy"
    Write-Host $statusResult.Output
    
    Write-Host "`n✅ SSL fix deployed successfully!"
    Write-Host "Wait 1-2 minutes for SSL certificates to be provisioned, then visit:"
    Write-Host "  https://murciawelcomesyou.com"
    Write-Host "  https://www.murciawelcomesyou.com"
    
    # Close session
    Remove-SSHSession -SessionId $session.SessionId
    
} catch {
    Write-Host "❌ Error: $_"
    Write-Host "`nPlease try manual deployment using the instructions in deployment_instructions.md"
}
