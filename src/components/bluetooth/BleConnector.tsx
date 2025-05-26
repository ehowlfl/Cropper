import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Usb, Cable, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

// Web Serial API 타입 정의
type SerialOptions = {
  baudRate: number;
};

type SerialPortInfo = {
  usbVendorId?: number;
  usbProductId?: number;
};

// 브라우저 환경에서 사용할 타입 정의
interface ISerialPort {
  open: (options: SerialOptions) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo: () => SerialPortInfo;
}

interface ISerial {
  requestPort: () => Promise<ISerialPort>;
  getPorts: () => Promise<ISerialPort[]>;
}

// navigator.serial 타입 정의
declare global {
  interface Navigator {
    serial: ISerial;
  }
}

interface SerialConnectorProps {
  onConnect?: (port: ISerialPort) => void;
  onDisconnect?: () => void;
  onData?: (data: string) => void;
}

export function SerialConnector({ 
  onConnect,
  onDisconnect,
  onData
}: SerialConnectorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const portRef = useRef<ISerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  // Check if Web Serial API is supported
  const isSerialSupported = 'serial' in navigator;

  // Cleanup function for disconnecting
  const disconnect = async () => {
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (error) {
        console.error('Error cancelling reader:', error);
      }
      readerRef.current = null;
    }
    
    if (portRef.current && portRef.current.readable) {
      try {
        await portRef.current.close();
      } catch (error) {
        console.error('Error closing port:', error);
      }
      portRef.current = null;
    }
    
    setIsConnected(false);
    setDeviceName('');
    if (onDisconnect) onDisconnect();
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Function to read data from the serial port
  const readSerialData = async (port: ISerialPort) => {
    if (!port.readable) {
      console.error('Port is not readable');
      return;
    }

    try {
      const textDecoder = new TextDecoder();
      const reader = port.readable.getReader();
      readerRef.current = reader;

      // Read data loop
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Allow the serial port to be closed later
          reader.releaseLock();
          break;
        }
        if (value) {
          // Uint8Array를 받아서 문자열로 변환
          const text = textDecoder.decode(value);
          if (onData) onData(text);
        }
      }
    } catch (error) {
      console.error('Error reading data from serial port:', error);
      disconnect();
    }
  };

  // Connect to serial port
  const connectSerial = async () => {
    if (!isSerialSupported) {
      alert('Web Serial API is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    try {
      setIsConnecting(true);
      
      // Request port access
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 }); // HC-06 default baud rate is 9600
      
      // Get port info
      const portInfo = port.getInfo();
      setDeviceName(`Serial Port ${portInfo.usbVendorId || ''} ${portInfo.usbProductId || ''}`);
      
      portRef.current = port;
      setIsConnected(true);
      
      if (onConnect) onConnect(port);
      
      // Start reading data
      readSerialData(port);
    } catch (error) {
      console.error('Error connecting to serial port:', error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2"
    >
      {!isSerialSupported && (
        <Badge variant="destructive" className="mr-2">
          Web Serial API not supported
        </Badge>
      )}
      
      <Button 
        onClick={isConnected ? disconnect : connectSerial} 
        disabled={!isSerialSupported || isConnecting}
        className="flex items-center gap-2"
        variant={isConnected ? "destructive" : "default"}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            {isConnected ? <Usb className="h-4 w-4" /> : <Cable className="h-4 w-4" />}
            <span>{isConnected ? 'Disconnect' : 'Connect HC-06'}</span>
          </>
        )}
      </Button>
      
      {isConnected && (
        <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          Connected: {deviceName || 'Serial Device'}
        </Badge>
      )}
    </motion.div>
  );
}