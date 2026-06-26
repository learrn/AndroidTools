import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { DeviceInfo, listDevices } from "./lib/adb";

export default function DevicesCommand() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const next = await listDevices();
      setDevices(next);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load devices",
        message: error instanceof Error ? error.message : String(error),
      });
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search device by serial/model">
      {devices.length === 0 && !isLoading ? (
        <List.EmptyView title="No devices" description="Connect a device and enable USB debugging." />
      ) : null}
      {devices.map((device) => (
        <List.Item
          key={device.serial}
          icon={Icon.Mobile}
          title={device.model || device.serial}
          subtitle={device.serial}
          accessories={[{ tag: device.state }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Serial" content={device.serial} />
              <Action.CopyToClipboard title="Copy Full Row" content={device.raw} />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
