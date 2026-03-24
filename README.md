# AndroidTools

AndroidTools is a uTools plugin project for common Android ADB operations, with optional MCP server support for LLM/tool integrations.

## Features

- Install APK from local file, URL, or QR code.
- Configure ADB path and APK download path in plugin storage.
- Common ADB commands:
  - device screenshot
  - set/clear device HTTP proxy
  - adb input text
- MCP service lifecycle commands in uTools:
  - `start-mcp-service`
  - `stop-mcp-service`
  - `mcp-service-status`

## Project Structure

- `preload.js`: uTools plugin entry and command dispatch.
- `apk.js`: APK download/install and ADB helper logic.
- `mcp-server.js`: MCP stdio server that exposes ADB tools.
- `plugin.json`: uTools plugin metadata and command definitions.
- `MCP_USAGE.md`: MCP usage examples.

## Requirements

- Node.js (CommonJS runtime)
- `adb` available in PATH, or configured in plugin settings
- uTools runtime for plugin execution

## Install Dependencies

```bash
npm install
```

## Run MCP Server

```bash
npm run mcp
```

Optional environment variable:

- `ADB_PATH`: absolute path to adb binary (default: `adb`)

## MCP Tools

- `adb_devices`
- `adb_install`
- `adb_shell`
- `adb_set_proxy`
- `adb_clear_proxy`
- `adb_screenshot`
- `adb_raw`

See `MCP_USAGE.md` for call examples.

## Security Notes

- This repository should not contain private keys, tokens, or account credentials.
- Local machine artifacts are ignored via `.gitignore` (for example `${APPDATA}` and workspace temp folders).
- Before pushing, run a quick secret scan:

```bash
rg -n --hidden -S "BEGIN OPENSSH PRIVATE KEY|BEGIN RSA PRIVATE KEY|ghp_|github_pat_|AKIA|AIza|token|password|secret"
```

## License

No explicit license file is included yet. Add one if you plan to open-source this repository.
