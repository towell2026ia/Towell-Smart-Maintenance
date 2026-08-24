# deploy_edge_functions.ps1
# Automatización de despliegue y sincronización de secretos de Supabase Edge Functions (TSM-AI AG-001)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 TSM-AI: Despliegue de Edge Functions & Sincronización de Secretos" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$PROJECT_REF = "xqfpsavkefhrxfbtqzec"
$ENV_FILE = ".env"

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "❌ Archivo .env no encontrado en el directorio raíz." -ForegroundColor Red
    exit 1
}

Write-Host "`n1. Leyendo variables desde $ENV_FILE..." -ForegroundColor Yellow
$envContent = Get-Content $ENV_FILE

$openAiKey = ""
$mimoKey = ""

foreach ($line in $envContent) {
    $trimmed = $line.Trim()
    if ($trimmed -and -not $trimmed.StartsWith("#")) {
        if ($trimmed -match "^OPENAI_API_KEY=(.+)$") {
            $openAiKey = $matches[1].Trim().Trim('"').Trim("'")
        }
        if ($trimmed -match "^MIMO_API_KEY=(.+)$") {
            $mimoKey = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

if ($openAiKey) {
    Write-Host "   ✅ OPENAI_API_KEY detectada" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ OPENAI_API_KEY no encontrada en .env" -ForegroundColor DarkYellow
}

if ($mimoKey) {
    Write-Host "   ✅ MIMO_API_KEY detectada" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ MIMO_API_KEY no encontrada en .env" -ForegroundColor DarkYellow
}

Write-Host "`n2. Sincronizando secretos en proyecto Supabase ($PROJECT_REF)..." -ForegroundColor Yellow
$secretsArgs = @()
if ($openAiKey) { $secretsArgs += "OPENAI_API_KEY=$openAiKey" }
if ($mimoKey) { $secretsArgs += "MIMO_API_KEY=$mimoKey" }
$secretsArgs += "MULTIAGENT_ENABLED=true"
$secretsArgs += "LLM_CALLS_ENABLED=true"
$secretsArgs += "AI_ROUTER_ENABLED=true"
$secretsArgs += "OPENAI_ENABLED=true"
$secretsArgs += "MIMO_ENABLED=true"

# Ejecutar establecimiento de secretos
try {
    Write-Host "   Ejecutando: npx supabase secrets set --project-ref $PROJECT_REF ..." -ForegroundColor Gray
    & npx supabase secrets set --project-ref $PROJECT_REF @secretsArgs
    Write-Host "   ✅ Secretos actualizados en Supabase Cloud." -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Advertencia sincronizando secretos: $($_.Exception.Message)" -ForegroundColor DarkYellow
}

Write-Host "`n3. Desplegando Edge Function 'agents-orchestrator'..." -ForegroundColor Yellow
try {
    Write-Host "   Ejecutando: npx supabase functions deploy agents-orchestrator --project-ref $PROJECT_REF --no-verify-jwt" -ForegroundColor Gray
    & npx supabase functions deploy agents-orchestrator --project-ref $PROJECT_REF --no-verify-jwt
    Write-Host "   ✅ Edge Function desplegada exitosamente." -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error durante el despliegue: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Verificando conectividad del endpoint en vivo..." -ForegroundColor Yellow
$testUrl = "https://$PROJECT_REF.supabase.co/functions/v1/agents-orchestrator"
try {
    $response = Invoke-RestMethod -Uri $testUrl -Method Post -ContentType "application/json" -Body '{"event_type":"AI_RECOMMENDATIONS_REQUESTED"}' -TimeoutSec 15
    Write-Host "   ✅ Respuesta en vivo recibida:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3 | Write-Host -ForegroundColor Cyan
} catch {
    Write-Host "   ℹ️ Estado de verificación HTTP: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "🏁 Proceso de despliegue y auditoría completado." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
