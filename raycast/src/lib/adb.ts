import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

interface Preferences {
  adbPath?: string;
}

export interface DeviceInfo {
  serial: string;
  state: string;
  model?: string;
  raw: string;
}

function getAdbPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.adbPath?.trim() || "adb";
}

function withDevice(serial: string | undefined, args: string[]): string[] {
  if (!serial || serial === "auto") {
    return args;
  }
  return ["-s", serial, ...args];
}

export async function runAdb(args: string[], serial?: string): Promise<{ stdout: string; stderr: string }> {
  const adbPath = getAdbPath();
  try {
    const { stdout = "", stderr = "" } = await execFileAsync(adbPath, withDevice(serial, args), {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string };
    const message = (err.stderr || err.message || "adb command failed").trim();
    throw new Error(message);
  }
}

export async function listDevices(): Promise<DeviceInfo[]> {
  const { stdout } = await runAdb(["devices", "-l"]);
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices attached"));

  return lines.map((line) => {
    const parts = line.split(/\s+/);
    const serial = parts[0] || "";
    const state = parts[1] || "unknown";
    const model = line.match(/model:(\S+)/)?.[1];
    return {
      serial,
      state,
      model,
      raw: line,
    };
  });
}

export async function setProxy(host: string, port: number, serial?: string): Promise<void> {
  await runAdb(["shell", "settings", "put", "global", "http_proxy", `${host}:${port}`], serial);
}

export async function clearProxy(serial?: string): Promise<void> {
  const commands = [
    ["shell", "settings", "put", "global", "http_proxy", ":0"],
    ["shell", "settings", "delete", "global", "http_proxy"],
    ["shell", "settings", "delete", "global", "global_http_proxy_host"],
    ["shell", "settings", "delete", "global", "global_http_proxy_port"],
  ];

  for (const command of commands) {
    await runAdb(command, serial);
  }
}

export async function captureScreenshot(localPath: string, serial?: string, remotePath?: string): Promise<void> {
  const devicePath = remotePath?.trim() || `/sdcard/raycast_screen_${Date.now()}.png`;
  await mkdir(dirname(localPath), { recursive: true });
  await runAdb(["shell", "screencap", devicePath], serial);
  await runAdb(["pull", devicePath, localPath], serial);

  try {
    await runAdb(["shell", "rm", devicePath], serial);
  } catch {
    // ignore cleanup failure on some ROMs
  }
}

export function splitArgs(command: string): string[] {
  const output: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|\S+/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(command))) {
    const token = match[1] ?? match[2] ?? match[0];
    output.push(token.replace(/\\(["'\\])/g, "$1"));
  }

  return output;
}
