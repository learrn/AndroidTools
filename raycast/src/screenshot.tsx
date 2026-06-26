import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { captureScreenshot, DeviceInfo, listDevices } from "./lib/adb";

interface ScreenshotValues {
  localPath: string;
  remotePath?: string;
  device?: string;
}

export default function ScreenshotCommand() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    listDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const onSubmit = async (values: ScreenshotValues) => {
    const localPath = values.localPath?.trim();
    if (!localPath) {
      await showToast({ style: Toast.Style.Failure, title: "Local path is required" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Capturing screenshot..." });

    try {
      await captureScreenshot(localPath, values.device, values.remotePath);
      toast.style = Toast.Style.Success;
      toast.title = "Screenshot saved";
      toast.message = localPath;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Screenshot failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="localPath" title="Local Path" placeholder="/Users/me/Desktop/screen.png" />
      <Form.TextField id="remotePath" title="Device Path (Optional)" placeholder="/sdcard/screen.png" />
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
