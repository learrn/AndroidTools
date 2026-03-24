const { execFile } = require("child_process");

const SERVER_NAME = "android-tool-mcp";
const SERVER_VERSION = "1.0.0";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const adbPath = process.env.ADB_PATH || "adb";

// MCP tool registry exposed to clients via tools/list.
const tools = [
  {
    name: "adb_devices",
    description: "List connected Android devices with details (adb devices -l).",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "adb_install",
    description: "Install an APK with -t -d -r flags.",
    inputSchema: {
      type: "object",
      properties: {
        apkPath: { type: "string", description: "Absolute path to APK file." },
        device: { type: "string", description: "Optional adb serial from adb devices." },
      },
      required: ["apkPath"],
      additionalProperties: false,
    },
  },
  {
    name: "adb_shell",
    description: "Run adb shell command on a device.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command string, e.g. pm list packages" },
        args: { type: "array", items: { type: "string" }, description: "Alternative to command string." },
        device: { type: "string", description: "Optional adb serial from adb devices." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "adb_set_proxy",
    description: "Set global HTTP proxy on device.",
    inputSchema: {
      type: "object",
      properties: {
        host: { type: "string", description: "Proxy host, e.g. 192.168.1.10" },
        port: { type: "integer", description: "Proxy port, e.g. 8999" },
        device: { type: "string", description: "Optional adb serial from adb devices." },
      },
      required: ["host", "port"],
      additionalProperties: false,
    },
  },
  {
    name: "adb_clear_proxy",
    description: "Clear global HTTP proxy on device.",
    inputSchema: {
      type: "object",
      properties: {
        device: { type: "string", description: "Optional adb serial from adb devices." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "adb_screenshot",
    description: "Capture screenshot and pull it to local path.",
    inputSchema: {
      type: "object",
      properties: {
        localPath: { type: "string", description: "Absolute local path, e.g. C:/tmp/screen.png" },
        remotePath: { type: "string", description: "Device path. Default: /sdcard/screen.png" },
        device: { type: "string", description: "Optional adb serial from adb devices." },
      },
      required: ["localPath"],
      additionalProperties: false,
    },
  },
  {
    name: "adb_raw",
    description: "Run raw adb args for advanced use cases.",
    inputSchema: {
      type: "object",
      properties: {
        args: { type: "array", items: { type: "string" }, description: "Raw adb args array." },
      },
      required: ["args"],
      additionalProperties: false,
    },
  },
];

// JSON-RPC method handlers for MCP stdio protocol.
const handlers = {
  initialize: async (params) => {
    const protocolVersion = params?.protocolVersion || DEFAULT_PROTOCOL_VERSION;
    return {
      protocolVersion,
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    };
  },

  "tools/list": async () => ({ tools }),

  "tools/call": async (params) => {
    const name = params?.name;
    const args = params?.arguments || {};

    switch (name) {
      case "adb_devices": {
        const out = await runAdb([]);
        return textResult(out.stdout || "");
      }
      case "adb_install": {
        requireString(args.apkPath, "apkPath");
        const out = await runAdb(withDevice(args.device, ["install", "-t", "-d", "-r", args.apkPath]));
        return textResult(out.stdout || "");
      }
      case "adb_shell": {
        const shellArgs = resolveShellArgs(args);
        const out = await runAdb(withDevice(args.device, ["shell", ...shellArgs]));
        return textResult(out.stdout || "");
      }
      case "adb_set_proxy": {
        requireString(args.host, "host");
        requireNumber(args.port, "port");
        const proxy = `${args.host}:${args.port}`;
        const out = await runAdb(withDevice(args.device, ["shell", "settings", "put", "global", "http_proxy", proxy]));
        return textResult(out.stdout || "OK");
      }
      case "adb_clear_proxy": {
        const cmds = [
          ["shell", "settings", "put", "global", "http_proxy", ":0"],
          ["shell", "settings", "delete", "global", "http_proxy"],
          ["shell", "settings", "delete", "global", "global_http_proxy_host"],
          ["shell", "settings", "delete", "global", "global_http_proxy_port"],
        ];
        const outputs = [];
        for (const cmd of cmds) {
          const out = await runAdb(withDevice(args.device, cmd));
          if (out.stdout) outputs.push(out.stdout.trim());
        }
        return textResult(outputs.filter(Boolean).join("\n") || "OK");
      }
      case "adb_screenshot": {
        requireString(args.localPath, "localPath");
        const remotePath = args.remotePath || "/sdcard/screen.png";
        await runAdb(withDevice(args.device, ["shell", "screencap", remotePath]));
        const out = await runAdb(withDevice(args.device, ["pull", remotePath, args.localPath]));
        return textResult(out.stdout || `Saved to ${args.localPath}`);
      }
      case "adb_raw": {
        if (!Array.isArray(args.args) || args.args.length === 0) {
          throw new Error("args must be a non-empty string array");
        }
        const out = await runAdb(args.args);
        return textResult(out.stdout || "");
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  },
};

function withDevice(device, args) {
  if (device && typeof device === "string") {
    return ["-s", device, ...args];
  }
  return args;
}

function resolveShellArgs(args) {
  if (Array.isArray(args.args) && args.args.length > 0) {
    return args.args.map(String);
  }
  if (typeof args.command === "string" && args.command.trim()) {
    return splitArgs(args.command);
  }
  throw new Error("adb_shell requires either command or args");
}

function splitArgs(command) {
  const out = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;
  let m;
  while ((m = re.exec(command))) {
    const token = m[1] ?? m[2] ?? m[0];
    out.push(token.replace(/\\(["'\\])/g, "$1"));
  }
  return out;
}

function requireString(val, name) {
  if (typeof val !== "string" || !val.trim()) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function requireNumber(val, name) {
  if (typeof val !== "number" || Number.isNaN(val)) {
    throw new Error(`${name} must be a number`);
  }
}

// Execute adb with a bounded output buffer and normalized UTF-8 output.
function runAdb(args) {
  return new Promise((resolve, reject) => {
    execFile(adbPath, args, { windowsHide: true, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const err = new Error((stderr || error.message || "adb failed").trim());
        err.code = error.code;
        reject(err);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function textResult(text, isError = false) {
  return {
    content: [{ type: "text", text: text || "" }],
    isError,
  };
}

function writeMessage(msg) {
  const json = JSON.stringify(msg);
  const payload = `Content-Length: ${Buffer.byteLength(json, "utf8")}\r\n\r\n${json}`;
  process.stdout.write(payload);
}

function sendResponse(id, result) {
  writeMessage({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  writeMessage({ jsonrpc: "2.0", id, error: { code, message } });
}

// Minimal stdio framing parser for "Content-Length" based JSON-RPC messages.
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = "";
      return;
    }

    const contentLength = Number(match[1]);
    const messageStart = headerEnd + 4;
    if (buffer.length < messageStart + contentLength) return;

    const raw = buffer.slice(messageStart, messageStart + contentLength);
    buffer = buffer.slice(messageStart + contentLength);

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (_err) {
      continue;
    }

    if (!msg || typeof msg !== "object") continue;
    if (!msg.method) continue;

    const { id, method, params } = msg;

    if (method === "notifications/initialized") {
      continue;
    }

    const handler = handlers[method];
    if (!handler) {
      if (id !== undefined) sendError(id, -32601, `Method not found: ${method}`);
      continue;
    }

    try {
      const result = await handler(params || {});
      if (id !== undefined) sendResponse(id, result);
    } catch (err) {
      if (id !== undefined) sendError(id, -32000, err.message || "Internal error");
    }
  }
});

process.stdin.resume();
