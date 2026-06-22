# Backup Solution Design

**Date:** 2026-06-22  
**Status:** Approved

## Overview

A PowerShell-based backup solution that backs up two SQL Server databases and the uploads folder to G: drive. Runs automatically at midnight daily via Windows Task Scheduler and can also be triggered manually.

## Scope

- Backup `cedar_new` database (`CEDAR` on `localhost\SQLSERVER2022DEV:1434`)
- Backup `cedar_old` database (`Cedar6_Mars` on `192.168.0.208\sqlexpress2008:1433`)
- Backup `D:\mars-abnormal-finding\backend\uploads\` folder
- No retention policy — all backups are kept indefinitely

## File Layout

```
D:\mars-abnormal-finding\scripts\
  backup.ps1            # Main backup script — run manually or by Task Scheduler
  setup-schedule.ps1    # One-time script to register the Task Scheduler job

G:\Backups\
  backup.log            # Cumulative log of all backup runs
  2026-06-22\
    CEDAR_new.bak
    CEDAR_old.bak
    uploads.zip
  2026-06-23\
    CEDAR_new.bak
    CEDAR_old.bak
    uploads.zip
```

## backup.ps1 — Behavior

1. Compute today's date as `YYYY-MM-DD`; create `G:\Backups\YYYY-MM-DD\` if it doesn't exist
2. Run `BACKUP DATABASE CEDAR TO DISK = '...\CEDAR_new.bak' WITH INIT, COMPRESSION` via `sqlcmd`
   - Server: `localhost\SQLSERVER2022DEV,1434` | User: `sa`
3. Run `BACKUP DATABASE Cedar6_Mars TO DISK = '...\CEDAR_old.bak' WITH INIT, COMPRESSION` via `sqlcmd`
   - Server: `192.168.0.208\sqlexpress2008,1433` | User: `sa`
4. Zip `D:\mars-abnormal-finding\backend\uploads\` → `...\uploads.zip` using `Compress-Archive`
5. Append a timestamped result line (success or failure) to `G:\Backups\backup.log` for each of the three steps
6. Exit with code `0` on full success, `1` if any step failed

## setup-schedule.ps1 — Behavior

One-time script, must be run as Administrator:

1. Registers a Task Scheduler job named `MarsBackup`
2. Trigger: daily at 00:00, runs whether or not a user is logged in
3. Action: `powershell.exe -NonInteractive -ExecutionPolicy Bypass -File D:\mars-abnormal-finding\scripts\backup.ps1`
4. Re-running the script overwrites the existing task (idempotent)
5. Prints the task name and next scheduled run time on completion

## Technology

- **DB backup:** `sqlcmd` (bundled with SQL Server, already available on this machine)
- **Folder backup:** `Compress-Archive` (built into PowerShell 5.1)
- **Scheduling:** Windows Task Scheduler via `Register-ScheduledTask` PowerShell cmdlet
- **Credentials:** Read from hardcoded values matching `backend/.env` (sa / `Jir@202501`)

## Non-Goals

- No encryption of backup files
- No remote/cloud offload
- No email/notification on failure
- No retention/cleanup policy
