$toolInput = $env:CLAUDE_TOOL_INPUT | ConvertFrom-Json
$filePath = $toolInput.file_path

if ($filePath -match 'frontend[/\\]src' -and $filePath -match '\.(ts|tsx)$') {
    Push-Location D:/mars-abnormal-finding/frontend
    $result = npx eslint $filePath --fix 2>&1
    if ($result) { $result | Select-Object -Last 20 | Write-Output }
    Pop-Location
}
