# Quick Migration Script for PowerShell
# This script helps automate the migration from local PostgreSQL to Neon

param(
    [Parameter(Mandatory=$false)]
    [string]$Action = "help"
)

function Show-Help {
    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║     HiveNote: PostgreSQL to Neon Migration Helper        ║" -ForegroundColor Cyan
    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\migrate-to-neon.ps1 -Action <action>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available Actions:" -ForegroundColor Green
    Write-Host "  backup      - Create backup of local PostgreSQL database"
    Write-Host "  export      - Export data counts before migration"
    Write-Host "  deploy      - Run Prisma migrations on new database"
    Write-Host "  verify      - Verify migration was successful"
    Write-Host "  test        - Test database connection"
    Write-Host "  rollback    - Restore local configuration"
    Write-Host ""
    Write-Host "Example Workflow:" -ForegroundColor Yellow
    Write-Host "  1. .\migrate-to-neon.ps1 -Action backup"
    Write-Host "  2. .\migrate-to-neon.ps1 -Action export"
    Write-Host "  3. [Update .env with Neon connection string]"
    Write-Host "  4. .\migrate-to-neon.ps1 -Action deploy"
    Write-Host "  5. [Import data using pg_dump method from guide]"
    Write-Host "  6. .\migrate-to-neon.ps1 -Action verify"
    Write-Host ""
}

function Backup-Database {
    Write-Host "📦 Creating database backup..." -ForegroundColor Cyan
    Write-Host ""
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupFile = "backup_$timestamp.sql"
    
    Write-Host "Backup file: $backupFile" -ForegroundColor Yellow
    Write-Host ""
    
    # Try to find pg_dump
    $pgdump = $null
    
    # Check if pg_dump is in PATH
    $pgdump = Get-Command pg_dump -ErrorAction SilentlyContinue
    
    if ($null -eq $pgdump) {
        # Try common PostgreSQL installation paths
        $commonPaths = @(
            "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $pgdump = $path
                break
            }
        }
    }
    
    if ($null -eq $pgdump) {
        Write-Host "❌ pg_dump not found!" -ForegroundColor Red
        Write-Host "Please install PostgreSQL client tools or add them to PATH" -ForegroundColor Yellow
        Write-Host "Common path: C:\Program Files\PostgreSQL\XX\bin\" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Using pg_dump at: $pgdump" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 You'll be prompted for your PostgreSQL password" -ForegroundColor Yellow
    Write-Host ""
    
    # Run pg_dump
    try {
        if ($pgdump -is [System.Management.Automation.CommandInfo]) {
            pg_dump -U postgres -h localhost -p 5432 -d hivenote -F p -f $backupFile
        } else {
            & $pgdump -U postgres -h localhost -p 5432 -d hivenote -F p -f $backupFile
        }
        
        if (Test-Path $backupFile) {
            $fileSize = (Get-Item $backupFile).Length / 1KB
            Write-Host ""
            Write-Host "✅ Backup created successfully!" -ForegroundColor Green
            Write-Host "File: $backupFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "❌ Backup file not created" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Backup failed: $_" -ForegroundColor Red
        exit 1
    }
}

function Export-Counts {
    Write-Host "📊 Exporting database counts..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check if node is available
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($null -eq $node) {
        Write-Host "❌ Node.js not found!" -ForegroundColor Red
        exit 1
    }
    
    # Check if verify-migration.js exists
    if (-not (Test-Path "verify-migration.js")) {
        Write-Host "❌ verify-migration.js not found!" -ForegroundColor Red
        Write-Host "Please ensure the file exists in the current directory" -ForegroundColor Yellow
        exit 1
    }
    
    node verify-migration.js --export
}

function Deploy-Migrations {
    Write-Host "🚀 Deploying Prisma migrations to new database..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check DATABASE_URL
    if (-not (Test-Path ".env")) {
        Write-Host "❌ .env file not found!" -ForegroundColor Red
        exit 1
    }
    
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "neon\.tech") {
        Write-Host "✅ Neon connection string detected in .env" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "⚠️  Warning: .env doesn't seem to contain Neon connection" -ForegroundColor Yellow
        Write-Host "Please update DATABASE_URL in .env before proceeding" -ForegroundColor Yellow
        $confirm = Read-Host "Continue anyway? (y/n)"
        if ($confirm -ne "y") {
            exit 0
        }
    }
    
    Write-Host "Generating Prisma Client..." -ForegroundColor Cyan
    npx prisma generate
    
    Write-Host ""
    Write-Host "Running migrations..." -ForegroundColor Cyan
    npx prisma migrate deploy
    
    Write-Host ""
    Write-Host "✅ Migrations deployed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Export data from local database"
    Write-Host "  2. Import data to Neon"
    Write-Host "  3. Run verification"
    Write-Host ""
}

function Verify-Migration {
    Write-Host "🔍 Verifying migration..." -ForegroundColor Cyan
    Write-Host ""
    
    # Check if verify-migration.js exists
    if (-not (Test-Path "verify-migration.js")) {
        Write-Host "❌ verify-migration.js not found!" -ForegroundColor Red
        exit 1
    }
    
    # Check if counts file exists
    if (-not (Test-Path "migration-counts.json")) {
        Write-Host "⚠️  Warning: migration-counts.json not found!" -ForegroundColor Yellow
        Write-Host "Run export action before migration for verification" -ForegroundColor Yellow
        Write-Host ""
    }
    
    node verify-migration.js --verify
}

function Test-Connection {
    Write-Host "🔌 Testing database connection..." -ForegroundColor Cyan
    Write-Host ""
    
    if (-not (Test-Path "verify-migration.js")) {
        Write-Host "❌ verify-migration.js not found!" -ForegroundColor Red
        exit 1
    }
    
    node verify-migration.js --test
}

function Rollback-Configuration {
    Write-Host "⏮️  Rolling back configuration..." -ForegroundColor Cyan
    Write-Host ""
    
    if (Test-Path ".env.local.backup") {
        Copy-Item ".env.local.backup" ".env" -Force
        Write-Host "✅ .env restored from backup" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Regenerating Prisma Client..." -ForegroundColor Cyan
        npx prisma generate
        
        Write-Host ""
        Write-Host "✅ Rollback complete!" -ForegroundColor Green
        Write-Host "Your application is now pointing to local PostgreSQL again" -ForegroundColor Green
    } else {
        Write-Host "❌ No backup found (.env.local.backup)" -ForegroundColor Red
        Write-Host "Please manually restore your .env file" -ForegroundColor Yellow
    }
}

# Main execution
switch ($Action.ToLower()) {
    "backup" { Backup-Database }
    "export" { Export-Counts }
    "deploy" { Deploy-Migrations }
    "verify" { Verify-Migration }
    "test" { Test-Connection }
    "rollback" { Rollback-Configuration }
    default { Show-Help }
}
