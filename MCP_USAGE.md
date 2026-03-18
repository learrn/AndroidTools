# AndroidTool MCP 支持

本项目已新增 MCP Server（stdio 模式），用于把 ADB 能力暴露给 MCP 客户端。

## 启动

```bash
npm run mcp
```

也可以在 uTools 中使用以下命令管理 MCP 进程：

- `start-mcp-service`
- `stop-mcp-service`
- `mcp-service-status`

可选环境变量：

- `ADB_PATH`：指定 adb 可执行文件路径（默认 `adb`）

## 已提供工具

- `adb_devices`：列出设备（`adb devices -l`）
- `adb_install`：安装 APK（`install -t -d -r`）
- `adb_shell`：执行 shell 命令
- `adb_set_proxy`：设置代理
- `adb_clear_proxy`：清理代理
- `adb_screenshot`：截图并拉取到本地
- `adb_raw`：执行原始 adb 参数

## 示例（tools/call）

```json
{
  "name": "adb_shell",
  "arguments": {
    "command": "pm list packages"
  }
}
```

```json
{
  "name": "adb_install",
  "arguments": {
    "apkPath": "C:/apk/demo.apk",
    "device": "emulator-5554"
  }
}
```

## 说明

- 现有 uTools 插件逻辑保持不变。
- MCP Server 文件为 `mcp-server.js`。
