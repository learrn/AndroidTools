import { Action, ActionPanel, Clipboard, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DeviceInfo, listDevices, runAdb, splitArgs } from "./lib/adb";

interface ShellFormValues {
  command: string;
  device?: string;
}

export default function AdbShellCommand() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    listDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const onSubmit = async (values: ShellFormValues) => {
    if (!values.command?.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Command is required" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Running adb shell..." });

    try {
      const out = await runAdb(["shell", ...splitArgs(values.command)], values.device);
      const output = out.stdout || out.stderr || "(empty output)";
      await Clipboard.copy(output);
      toast.style = Toast.Style.Success;
      toast.title = "Command finished";
      toast.message = "Output copied to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Command failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="command" title="Shell Command" placeholder="pm list packages" />
      <Form.Dropdown id="device" title="Device" defaultValue="auto">
        <Form.Dropdown.Item value="auto" title="Auto (adb default)" />
        {devices.map((device) => (
          <Form.Dropdown.Item
            key={device.serial}
            value={device.serial}
            title={`${device.model || device.serial} (${device.state})`}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
