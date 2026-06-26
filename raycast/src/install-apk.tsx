import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DeviceInfo, listDevices, runAdb } from "./lib/adb";

interface InstallApkFormValues {
  apkPath: string[];
  device?: string;
}

export default function InstallApkCommand() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    listDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const onSubmit = async (values: InstallApkFormValues) => {
    const apkPath = values.apkPath?.[0];
    if (!apkPath) {
      await showToast({ style: Toast.Style.Failure, title: "Please select an APK file" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing APK..." });

    try {
      const out = await runAdb(["install", "-t", "-d", "-r", apkPath], values.device);
      toast.style = Toast.Style.Success;
      toast.title = "APK installed";
      toast.message = out.stdout || "Success";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Install failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install APK" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="apkPath" title="APK File" allowMultipleSelection={false} canChooseDirectories={false} />
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
