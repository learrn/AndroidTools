---
name: release_prep
description: Pre-release preparation and post-release recovery for AndroidTools uTools plugin.
---

# AndroidTools Release Preparation Skill

This skill helps prepare the repository for packaging (pre-release) and restores files after packaging (post-release).

## Actions

### 1. Pre-release Preparation (打包前准备)
Run the script to move `.git` and all `.map`/`.js.gz` files out to the parent directory to keep the packaging directory clean.

Command:
```powershell
powershell -File .agents/skills/release_prep/scripts/prep.ps1
```

### 2. Post-release Recovery (打包后恢复)
Run the script to move `.git` and all `.map`/`.js.gz` files back to their original locations.

Command:
```powershell
powershell -File .agents/skills/release_prep/scripts/restore.ps1
```
