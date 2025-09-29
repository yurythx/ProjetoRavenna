# =========================================================
# SCRIPT DE MONITORAMENTO DOS SERVIÇOS
# =========================================================
# Monitora o status dos containers Docker do projeto
# =========================================================

Write-Host "=== MONITORAMENTO DOS SERVIÇOS - PROJETO RAVENNA ===" -ForegroundColor Green
Write-Host "Data/Hora: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

# Lista de containers para monitorar
$containers = @(
    "evolution_api",
    "projetoravenna-chatwoot-rails-1", 
    "chatwoot-sidekiq",
    "postgres_db",
    "redis_cache",
    "minio_server"
)

Write-Host "STATUS DOS CONTAINERS:" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

foreach ($container in $containers) {
    try {
        $status = docker inspect --format='{{.State.Status}}' $container 2>$null
        $health = docker inspect --format='{{.State.Health.Status}}' $container 2>$null
        
        if ($status) {
            $color = if ($status -eq "running") { "Green" } else { "Red" }
            Write-Host "✓ $container" -ForegroundColor $color -NoNewline
            Write-Host " - Status: $status" -ForegroundColor White
            
            if ($health -and $health -ne "<no value>") {
                $healthColor = if ($health -eq "healthy") { "Green" } else { "Yellow" }
                Write-Host "  Health: $health" -ForegroundColor $healthColor
            }
        } else {
            Write-Host "✗ $container - Container não encontrado" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "✗ $container - Erro ao verificar status" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "VERIFICAÇÃO DE CONECTIVIDADE:" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Testa conectividade dos serviços principais
$services = @{
    "Evolution API" = "http://localhost:8080"
    "Chatwoot" = "http://localhost:3000"
    "MinIO" = "http://localhost:9001"
}

foreach ($service in $services.GetEnumerator()) {
    try {
        $response = Invoke-WebRequest -Uri $service.Value -Method HEAD -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ $($service.Key) - Acessível" -ForegroundColor Green
        } else {
            Write-Host "⚠ $($service.Key) - Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "✗ $($service.Key) - Não acessível" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "VERIFICAÇÃO DE INSTÂNCIAS WHATSAPP:" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

try {
    $apiKey = "ies0F6xS9MTy8zxloNaJ5Ec3tyhuPA0f_super_segura_2024"
    $instances = Invoke-WebRequest -Uri "http://localhost:8080/instance/fetchInstances" -Headers @{"apikey"=$apiKey} -Method GET -ErrorAction SilentlyContinue
    
    if ($instances.StatusCode -eq 200) {
        $instanceData = $instances.Content | ConvertFrom-Json
        Write-Host "Total de instâncias: $($instanceData.Count)" -ForegroundColor White
        
        foreach ($instance in $instanceData.data) {
            $statusColor = switch ($instance.connectionStatus) {
                "open" { "Green" }
                "connecting" { "Yellow" }
                "close" { "Red" }
                default { "Gray" }
            }
            Write-Host "• $($instance.name) - Status: $($instance.connectionStatus)" -ForegroundColor $statusColor
        }
    } else {
        Write-Host "✗ Erro ao acessar API do Evolution" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Erro ao verificar instâncias WhatsApp" -ForegroundColor Red
}

Write-Host ""
Write-Host "RECURSOS DO SISTEMA:" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Informações de uso de recursos
try {
    $dockerStats = docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>$null
    if ($dockerStats) {
        Write-Host $dockerStats -ForegroundColor White
    }
}
catch {
    Write-Host "Não foi possível obter estatísticas dos containers" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== FIM DO MONITORAMENTO ===" -ForegroundColor Green