# Backup Solution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create two PowerShell scripts that back up the Cedar databases and uploads folder to G: drive daily at midnight via Windows Task Scheduler.

**Architecture:** `backup.ps1` runs three sequential operations (cedar_new DB → cedar_old DB → uploads zip), logs each result to `G:\Backups\backup.log`, and exits 0/1. `setup-schedule.ps1` is a one-time Admin script that registers the Windows Task Scheduler job.

**Tech Stack:** PowerShell 5.1, `sqlcmd` (bundled with SQL Server), `Compress-Archive` (built-in), `Register-ScheduledTask` (built-in)

---

### Task 1: Create `scripts/backup.ps1`

**Files:**
- Create: `scripts/backup.ps1`

- [ ] **Step 1: Create the scripts directory**

```powershell
New-Item -ItemType Directory -Path "D:\mars-abnormal-finding\scripts" -Force
```

- [ ] **Step 2: Write `scripts/backup.ps1`**

Create `D:\mars-abnormal-finding\scripts\backup.ps1` with this exact content:

```powershell
$date      = Get-Date -Format 'yyyy-MM-dd'
$backupDir = "G:\Backups\$date"
$logFile   = "G:\Backups\backup.log"
$exitCode  = 0

function Write-Log {
    param([string]$Message)
    $ts   = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $Message"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

# Guard: G: drive must be present
if (-not (Test-Path 'G:\')) {
    Write-Host "ERROR: G: drive not found. Aborting."
    exit 1
}

if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# ── cedar_new: CEDAR on localhost\SQLSERVER2022DEV:1434 ──────────────────────
$newBak = "$backupDir\CEDAR_new.bak"
$sql    = "BACKUP DATABASE [CEDAR] TO DISK = N'$newBak' WITH INIT, COMPRESSION, STATS = 10"
& sqlcmd -S "localhost\SQLSERVER2022DEV,1434" -U sa -P "Jir@202501" -Q $sql
if ($LASTEXITCODE -eq 0) {
    Write-Log "SUCCESS cedar_new -> $newBak"
} else {
    Write-Log "FAILED  cedar_new (sqlcmd exit $LASTEXITCODE)"
    $exitCode = 1
}

# ── cedar_old: Cedar6_Mars on 192.168.0.208\sqlexpress2008:1433 ─────────────
$oldBak = "$backupDir\CEDAR_old.bak"
$sql    = "BACKUP DATABASE [Cedar6_Mars] TO DISK = N'$oldBak' WITH INIT, COMPRESSION, STATS = 10"
& sqlcmd -S "192.168.0.208\sqlexpress2008,1433" -U sa -P "Jir@202501" -Q $sql
if ($LASTEXITCODE -eq 0) {
    Write-Log "SUCCESS cedar_old -> $oldBak"
} else {
    Write-Log "FAILED  cedar_old (sqlcmd exit $LASTEXITCODE)"
    $exitCode = 1
}

# ── uploads folder ───────────────────────────────────────────────────────────
$uploadsZip = "$backupDir\uploads.zip"
$uploadsSrc = "D:\mars-abnormal-finding\backend\uploads"
try {
    Compress-Archive -Path "$uploadsSrc\*" -DestinationPath $uploadsZip -Force
    Write-Log "SUCCESS uploads  -> $uploadsZip"
} catch {
    Write-Log "FAILED  uploads  -> $_"
    $exitCode = 1
}

exit $exitCode
```

- [ ] **Step 3: Verify the script runs manually (with G: drive present)**

Open PowerShell as Administrator and run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "D:\mars-abnormal-finding\scripts\backup.ps1"
```

Expected output (approximate):

```
Processed 100 percent of CEDAR database (file 1 on file 1).
BACKUP DATABASE successfully processed ...
[2026-06-22 00:01:05] SUCCESS cedar_new -> G:\Backups\2026-06-22\CEDAR_new.bak
Processed 100 percent of Cedar6_Mars database (file 1 on file 1).
BACKUP DATABASE successfully processed ...
[2026-06-22 00:01:30] SUCCESS cedar_old -> G:\Backups\2026-06-22\CEDAR_old.bak
[2026-06-22 00:01:32] SUCCESS uploads  -> G:\Backups\2026-06-22\uploads.zip
```

Then confirm files exist:

```powershell
$date = Get-Date -Format 'yyyy-MM-dd'
Get-ChildItem "G:\Backups\$date"
Get-Content "G:\Backups\backup.log" -Tail 5
```

Expected: three files (`CEDAR_new.bak`, `CEDAR_old.bak`, `uploads.zip`) and three SUCCESS log lines.

- [ ] **Step 4: Commit**

```powershell
git add scripts/backup.ps1
git commit -m "feat: add backup.ps1 for Cedar DBs and uploads"
```

---

### Task 2: Create `scripts/setup-schedule.ps1`

**Files:**
- Create: `scripts/setup-schedule.ps1`

- [ ] **Step 1: Write `scripts/setup-schedule.ps1`**

Create `D:\mars-abnormal-finding\scripts\setup-schedule.ps1` with this exact content:

```powershell
#Requires -RunAsAdministrator

$taskName   = 'MarsBackup'
$scriptPath = 'D:\mars-abnormal-finding\scripts\backup.ps1'

$action = New-ScheduledTaskAction `
    -Execute  'powershell.exe' `
    -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At '00:00'

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -StartWhenAvailable

$principal = New-ScheduledTaskPrincipal `
    -UserId    'SYSTEM' `
    -LogonType ServiceAccount `
    -RunLevel  Highest

# Remove existing task if present (idempotent)
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

Register-ScheduledTask `
    -TaskName   $taskName `
    -Action     $action `
    -Trigger    $trigger `
    -Settings   $settings `
    -Principal  $principal `
    -Description 'Daily backup of Cedar databases and uploads folder to G: drive'

$info = Get-ScheduledTask -TaskName $taskName | Get-ScheduledTaskInfo
Write-Host "Task '$taskName' registered. Next run: $($info.NextRunTime)"
```

- [ ] **Step 2: Run `setup-schedule.ps1` as Administrator**

Open PowerShell **as Administrator** and run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File "D:\mars-abnormal-finding\scripts\setup-schedule.ps1"
```

Expected output:

```
Task 'MarsBackup' registered. Next run: 06/23/2026 00:00:00
```

- [ ] **Step 3: Confirm the task in Task Scheduler**

```powershell
Get-ScheduledTask -TaskName 'MarsBackup' | Select-Object TaskName, State
Get-ScheduledTask -TaskName 'MarsBackup' | Get-ScheduledTaskInfo | Select-Object NextRunTime, LastRunTime, LastTaskResult
```

Expected:

```
TaskName  State
--------  -----
MarsBackup Ready

NextRunTime          LastRunTime          LastTaskResult
-----------          -----------          --------------
06/23/2026 00:00:00  01/01/0001 00:00:00               1
```

(`LastTaskResult = 1` means "never run yet" — that is correct before the first run.)

- [ ] **Step 4: Optionally do a test run via Task Scheduler**

```powershell
Start-ScheduledTask -TaskName 'MarsBackup'
Start-Sleep -Seconds 10
Get-ScheduledTask -TaskName 'MarsBackup' | Get-ScheduledTaskInfo | Select-Object LastRunTime, LastTaskResult
```

Expected: `LastTaskResult = 0` (success).

- [ ] **Step 5: Commit**

```powershell
git add scripts/setup-schedule.ps1
git commit -m "feat: add setup-schedule.ps1 for Task Scheduler registration"
```
