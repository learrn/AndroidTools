import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DeviceInfo, listDevices, setProxy } from "./lib/adb";

interface SetProxyValues {
  host: string;
  port: string;
  device?: string;
}

export default function SetProxyCommand() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);

  useEffect(() => {
    listDevices().then(setDevices).catch(() => setDevices([]));
  }, []);

  const onSubmit = async (values: SetProxyValues) => {
    const host = values.host?.trim();
    const port = Number(values.port);

    if (!host) {
      await showToast({ style: Toast.Style.Failure, title: "Host is required" });
      return;
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      await showToast({ style: Toast.Style.Failure, title: "Port must be 1-65535" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Setting proxy..." });

    try {
      await setProxy(host, port, values.device);
      toast.style = Toast.Style.Success;
      toast.title = "Proxy updated";
      toast.message = `${host}:${port}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Set proxy failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Proxy" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="host" title="Proxy Host" placeholder="192.168.1.10" />
      <Form.TextField id="port" title="Proxy Port" placeholder="8999" />
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
