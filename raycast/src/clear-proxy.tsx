import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { clearProxy, DeviceInfo, listDevices } from "./lib/adb";

interface ClearProxyValues {
  device?: string;
}

export default function ClearProxyCommand() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    listDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const onSubmit = async (values: ClearProxyValues) => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Clearing proxy..." });

    try {
      await clearProxy(values.device);
      toast.style = Toast.Style.Success;
      toast.title = "Proxy cleared";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Clear proxy failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Clear Proxy" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
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
