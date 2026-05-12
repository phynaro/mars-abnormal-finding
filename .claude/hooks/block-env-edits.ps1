$toolInput = $env:CLAUDE_TOOL_INPUT | ConvertFrom-Json
$filePath = $toolInput.file_path

if ($filePath -match '(^|[/\\])\.env($|\.)') {
    Write-Output "BLOCKED: .env files are protected. Edit them manually outside Claude Code."
    exit 2
}
