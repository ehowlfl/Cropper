import { useState, useCallback } from 'react';

interface UseBleConnectionProps {
  onDataReceived: (value: string) => void;
}

export function useBleConnection({ onDataReceived }: UseBleConnectionProps) {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectBLE = useCallback(async () => {
    if (!navigator.bluetooth) {
      setConnectionError("Bluetooth not supported");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["battery_service"] }],
        optionalServices: ["device_information"]
      });
      
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("Failed to connect to GATT server");
      }
      
      setDevice(device);
      setServer(server);

      // Set up listener for when device disconnects
      device.addEventListener('gattserverdisconnected', () => {
        setServer(null);
        setConnectionError("Device disconnected");
      });

      // Set up notifications
      const service = await server.getPrimaryService("battery_service");
      const characteristic = await service.getCharacteristic("battery_level");

      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = new TextDecoder().decode(target.value as DataView).trim();
        onDataReceived(value);
      });
      
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Unknown error");
      console.error("BLE Connection Failed", error);
    } finally {
      setIsConnecting(false);
    }
  }, [onDataReceived]);

  const sendColorOverBLE = useCallback(async (hexOrCommand: string) => {
    if (!server) {
      throw new Error("Not connected to any device");
    }
    
    try {
      const service = await server.getPrimaryService("battery_service");
      const characteristic = await service.getCharacteristic("battery_level");
      const data = new TextEncoder().encode(hexOrCommand);
      await characteristic.writeValue(data);
      return true;
    } catch (error) {
      console.error("BLE Send Error:", error);
      throw error;
    }
  }, [server]);

  return {
    device,
    server,
    connectBLE,
    sendColorOverBLE,
    isConnecting,
    connectionError
  };
}