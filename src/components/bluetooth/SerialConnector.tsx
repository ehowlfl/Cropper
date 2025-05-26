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
  onConnect?: (port: ISerialPort, writer: WritableStreamDefaultWriter<Uint8Array> | null) => void;
  onDisconnect?: () => void;
  onData?: (data: string) => void;
  isConnected?: boolean;
}

export function SerialConnector({
  onConnect,
  onDisconnect,
  onData,
  isConnected: propIsConnected
}: SerialConnectorProps) {
  const [isConnected, setIsConnected] = useState(propIsConnected || false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const portRef = useRef<ISerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const keepReading = useRef(true); // To control the read loop

  // Check if Web Serial API is supported
  const isSerialSupported = 'serial' in navigator;

  useEffect(() => {
    setIsConnected(propIsConnected || false);
  }, [propIsConnected]);

  // Cleanup function for disconnecting
  const disconnect = async () => {
    keepReading.current = false; // Signal readLoop to stop

    if (readerRef.current) {
      try {
        // The reader might be stuck in a read() call. Cancel it.
        await readerRef.current.cancel(); 
        // releaseLock might not be strictly necessary if cancel() is awaited and port will be closed
        // but it's good practice if the stream itself isn't immediately destroyed.
        // readerRef.current.releaseLock(); // This can cause issues if cancel() is not fully processed
      } catch (error) {
        console.error('Error cancelling reader:', error);
      }
      readerRef.current = null;
    }

    if (writerRef.current) {
      try {
        // Closing the writer ensures all pending writes are flushed before the port is closed.
        // If immediate close is needed, writer.abort() could be used.
        await writerRef.current.close();
        // writerRef.current.releaseLock(); // releaseLock is done implicitly by close()
      } catch (error) {
        console.error('Error closing writer:', error);
      }
      writerRef.current = null;
      // @ts-ignore
      window.serialWriter = null; // Clear global writer
    }

    if (portRef.current) {
      try {
        await portRef.current.close();
        console.log('Serial port closed.');
      } catch (error) {
        console.error('Error closing port:', error);
      }
    }

    portRef.current = null;
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
  const readSerialData = async () => {
    if (!portRef.current || !portRef.current.readable || !readerRef.current) {
      console.log('Port not readable or reader not available for readLoop.');
      return;
    }
    keepReading.current = true;
    try {
      while (portRef.current && portRef.current.readable && keepReading.current) {
        const reader = readerRef.current;
        if (!reader) break; 
        try {
            const { value, done } = await reader.read();
            if (done) {
                // Allow the serial port to be closed later.
                // readerRef.current.releaseLock(); // releaseLock is done in disconnectSerial
                break;
            }
            if (value) {
                const textDecoder = new TextDecoder();
                const text = textDecoder.decode(value);
                console.log('Received raw Uint8Array:', value); // 추가: Raw Uint8Array 출력
                console.log('Decoded text:', text); // 추가: 디코딩된 텍스트 출력
                if (onData) onData(text);
            }
        } catch(error) {
            // Handle cases like port being closed mid-read
            if (String(error).includes('port has been closed')) {
                console.log('Read loop: Port was closed.');
            } else {
                console.error('Read loop error:', error);
            }
            break; // Exit loop on error
        }
      }
    } catch (error) {
      console.error('Outer Read loop error:', error);
    }
  };

  // Connect to serial port
  const connectSerial = async () => {
    if (!isSerialSupported) {
      alert('Web Serial API is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    if (portRef.current) {
      console.log('Already connected or connection attempt in progress.');
      return;
    }

    try {
      setIsConnecting(true);
      
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 }); // HC-06 default baud rate is 9600
      
      const portInfo = port.getInfo();
      setDeviceName(`Serial Port ${portInfo.usbVendorId || ''} ${portInfo.usbProductId || ''}`);
      
      portRef.current = port;
      
      let localWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;

      // Setup reader first
      if (port.readable) {
        readerRef.current = port.readable.getReader();
        console.log('Serial reader obtained.');
        readSerialData(); // Start reading immediately
      } else {
        console.error('Port is not readable.');
      }

      // Setup writer
      if (port.writable) {
        writerRef.current = port.writable.getWriter();
        localWriter = writerRef.current;
        // @ts-ignore
        window.serialWriter = writerRef.current; // Kept for potential ongoing user tests
        console.log('Serial writer ready and assigned to window.serialWriter.');
      } else {
        console.log('No writable port found.');
      }
      
      setIsConnected(true); // Set connected status
      if (onConnect) {
        onConnect(port, localWriter); // Pass port and the obtained writer (or null)
      }
    } catch (error) {
      console.error('Error connecting to serial port:', error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
      // Ensure refs are cleared on failure
      portRef.current = null;
      readerRef.current = null;
      writerRef.current = null;
      // @ts-ignore
      window.serialWriter = null;
      setIsConnected(false);
      setIsConnecting(false);
      if (onDisconnect) onDisconnect(); // Call onDisconnect to reset parent state too
    } finally {
      setIsConnecting(false);
    }
  };

  /*
  const sendMessageViaConnector = async (data: string) => {
    if (writerRef.current) {
      try {
        const encoder = new TextEncoder();
        await writerRef.current.write(encoder.encode(data + '\n'));
        console.log('Message sent via SerialConnector:', data);
      } catch (error) {
        console.error('SerialConnector: Error sending message:', error);
        // Optionally, trigger disconnect or an error callback
      }
    } else {
      console.warn('SerialConnector: Writer not available to send message.');
    }
  };
  */

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
