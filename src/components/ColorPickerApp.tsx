import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { SerialConnector } from './bluetooth/SerialConnector';
import { ColorHistory } from './color-picker/ColorHistory';
import { DataView } from './color-picker/DataView';
import { useColorContext } from '../contexts/ColorDataContext';
import { toast } from 'sonner';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PinControlRulesProvider } from '../contexts/PinControlRulesContext';
import { ControlPanel } from './color-picker/ControlPanel';
import { ModeSelector } from './color-picker/ModeSelector';

interface SerialPort {
  writable: WritableStream<Uint8Array> | null;
  readable: ReadableStream<Uint8Array> | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo: () => { usbVendorId?: number; usbProductId?: number };
}

export function ColorPickerApp() {
  const { addReceivedData, addSentData, clearReceivedData, receivedData, sentData, history } = useColorContext();
  const [serialDataInput, setSerialDataInput] = useState('');
  const [mode, setMode] = useState<'data' | 'control'>('data');

  const dataReceivePortRef = useRef<SerialPort | null>(null);
  const [isDataReceivePortConnected, setIsDataReceivePortConnected] = useState(false);
  const controlWriterRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  const dataSendPortRef = useRef<SerialPort | null>(null);
  const dataSendWriterRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const [isDataSendPortConnected, setIsDataSendPortConnected] = useState(false);

  const handleReceivedData = useCallback(async (data: string): Promise<void> => {
    console.log('보드 1로부터 원시 데이터 수신:', data);
    let parts: number[] = [];

    if (data.startsWith('RGB:')) {
      const rgbString = data.substring(4);
      parts = rgbString.split(',').map(s => parseInt(s.trim(), 10));

      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const [r, g, b] = parts;
        const hexColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
        
        addReceivedData(hexColor);
        toast.success(`색상 수신: ${hexColor}`);

        if (mode === 'data' && dataSendWriterRef.current) {
          const textEncoder = new TextEncoder();
          try {
            await dataSendWriterRef.current.write(textEncoder.encode(data + '\n'));
            addSentData(data);
            toast.info(`아두이노 2로 자동 전송: ${data}`);
          } catch (error) {
            console.error('Error auto-sending data to Board 2:', error);
            toast.error('자동 데이터 전송 오류: ' + (error as Error).message);
          }
        } else if (mode === 'data' && !dataSendPortRef.current?.writable) {
          toast.info('아두이노 보드 2 (데이터 전송)가 연결되지 않았거나 자동 전송을 위해 쓰기 가능하지 않습니다.');
        }
      } else {
        toast.error('잘못된 RGB 형식 수신');
      }
    } else {
      toast.info(`RGB가 아닌 데이터 수신: ${data}`);
    }
  }, [mode, dataSendWriterRef, dataSendPortRef, addReceivedData, addSentData]);

  const handleSendSerialData = useCallback(async (data: string): Promise<void> => {
    if (data.trim() !== '') {
      if (dataSendWriterRef.current) {
        const textEncoder = new TextEncoder();
        try {
          await dataSendWriterRef.current.write(textEncoder.encode(data + '\n'));
          addSentData(data);
          toast.success('아두이노 2로 데이터 전송: ' + data);
        } catch (error) {
          console.error('Error sending data to Arduino 2:', error);
          toast.error('아두이노 2로 데이터 전송 중 오류: ' + (error as Error).message);
        }
      } else {
        toast.info("아두이노 보드 2 (데이터 전송)가 연결되지 않았거나 쓰기 도구를 사용할 수 없습니다.");
      }
    } else {
      // For empty data, perhaps do nothing or show a specific toast
    }
  }, [dataSendWriterRef, addSentData]);

  const handleModeChange = useCallback((newMode: 'data' | 'control') => {
    setMode(newMode);
    toast.info(`${newMode.toUpperCase()} 모드로 전환됨`);
  }, []);

  return (
    <PinControlRulesProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              아두이노 색상 선택기
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-lg text-gray-300"
            >
              USB 시리얼을 통해 아두이노에서 색상 선택, 식별 및 표시
            </motion.p>
          </header>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-2">📌 모드 설명</h2>
              <p className="mb-2"><strong>데이터 모드:</strong> 아두이노에서 색상 값을 수신하고 표시합니다.</p>
              <p><strong>제어 모드:</strong> 색상 명령을 전송하여 아두이노 LED를 직접 제어합니다.</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <h3 className="text-lg font-semibold mb-2">아두이노 보드 1 (데이터 수신)</h3>
              <SerialConnector 
                onConnect={(port, writer) => {
                  console.log('아두이노 보드 1 (데이터 수신)에 연결됨:', port);
                  dataReceivePortRef.current = port;
                  controlWriterRef.current = writer;
                  setIsDataReceivePortConnected(true);
                  toast.success('아두이노 보드 1에 연결됨');
                }} 
                onDisconnect={() => {
                  console.log('아두이노 보드 1 (데이터 수신) 연결 해제됨');
                  dataReceivePortRef.current = null;
                  controlWriterRef.current = null;
                  setIsDataReceivePortConnected(false);
                  toast.info('아두이노 보드 1 연결 해제됨');
                }}
                onData={handleReceivedData} 
                isConnected={isDataReceivePortConnected} 
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">아두이노 보드 2 (데이터 전송)</h3>
              <SerialConnector 
                onConnect={(port, writer) => {
                  console.log('아두이노 보드 2 (데이터 전송)에 연결됨:', port);
                  dataSendPortRef.current = port;
                  dataSendWriterRef.current = writer;
                  setIsDataSendPortConnected(true);
                  toast.success('아두이노 보드 2에 연결됨');
                }} 
                onDisconnect={() => {
                  console.log('아두이노 보드 2 (데이터 전송) 연결 해제됨');
                  dataSendPortRef.current = null;
                  dataSendWriterRef.current = null;
                  setIsDataSendPortConnected(false);
                  toast.info('아두이노 보드 2 연결 해제됨');
                }}
                onData={() => { /* Board 2 is send-only in this context */ }} 
                isConnected={isDataSendPortConnected} 
              />
              {isDataSendPortConnected && (
                <div className="w-full flex flex-col items-center space-y-4 mt-4">
                  <Input
                    type="text"
                    placeholder="전송할 데이터 입력 (예: RGB:255,0,0)"
                    value={serialDataInput}
                    onChange={(e) => setSerialDataInput(e.target.value)}
                    className="w-full max-w-md p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    onClick={() => handleSendSerialData(serialDataInput)}
                    disabled={!isDataSendPortConnected}
                    className="bg-green-500 hover:bg-green-600 text-white w-full max-w-md"
                  >
                    아두이노 2로 전송
                  </Button>
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <ModeSelector mode={mode} onChange={handleModeChange} />
            </div>
          </div>

          {mode === 'control' && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">제어판</h2>
              <ControlPanel sendCommand={handleSendSerialData} isConnected={isDataSendPortConnected} writer={dataSendWriterRef.current} />
            </div>
          )}

          {mode === 'data' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <ColorHistory history={history} />
              <DataView 
                receivedData={receivedData} 
                clearReceivedData={clearReceivedData}
              />
            </div>
          )}
        </motion.div>
      </div>
    </PinControlRulesProvider>
  );
}