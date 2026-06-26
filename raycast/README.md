# Android Tool Raycast Extension

This folder contains a native Raycast extension for the AndroidTool project.

## Commands

- `ADB Devices`: list connected devices.
- `Install APK`: install a local APK (`install -t -d -r`).
- `ADB Shell`: run a shell command on a selected device.
- `Set Device Proxy`: set `settings put global http_proxy`.
- `Clear Device Proxy`: clear global proxy values.
- `Device Screenshot`: run `screencap` and `pull` to local path.

## Setup

1. `cd raycast`
2. `npm install`
3. `npm run dev`
4. Import this local extension in Raycast when prompted.

## Preferences

- `ADB Path`: defaults to `adb`; set full path if adb is not in PATH.
