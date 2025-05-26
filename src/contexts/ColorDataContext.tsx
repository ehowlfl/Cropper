import React, { createContext, useState, useEffect, useCallback, useRef, useContext, ReactNode } from 'react';
import { getClosestColorName, hexToRgb } from '../lib/colorUtils';

interface ColorHistoryItem {
  hex: string;
  name: string;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

type ColorSubscriber = (rgb: RGBColor) => void;

interface ColorDataContextType {
  history: ColorHistoryItem[];
  receivedData: string[];
  sentData: string[];
  latestReceivedColor: RGBColor | null;
  addHistoryItem: (hex: string) => void;
  addReceivedData: (value: string) => void;
  addSentData: (value: string) => void;
  clearReceivedData: () => void;
  subscribeToNewColor: (callback: ColorSubscriber) => () => void;
  // publishColor is internal and shouldn't be exposed directly if not needed by consumers
}

const ColorDataContext = createContext<ColorDataContextType | undefined>(undefined);

export const ColorDataProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  console.log('ColorDataProvider initialized/re-initialized'); // For debugging provider re-renders
  const [history, setHistory] = useState<ColorHistoryItem[]>([]);
  const [receivedData, setReceivedData] = useState<string[]>(() => {
    const saved = localStorage.getItem("receivedData");
    return saved ? JSON.parse(saved) : [];
  });
  const [sentData, setSentData] = useState<string[]>(() => {
    const saved = localStorage.getItem("sentData");
    return saved ? JSON.parse(saved) : [];
  });
  const [latestReceivedColor, setLatestReceivedColor] = useState<RGBColor | null>(null);
  const newColorSubscribers = useRef<Set<ColorSubscriber>>(new Set());

  useEffect(() => {
    localStorage.setItem("receivedData", JSON.stringify(receivedData));
  }, [receivedData]);

  useEffect(() => {
    localStorage.setItem("sentData", JSON.stringify(sentData));
  }, [sentData]);

  const addHistoryItem = useCallback((hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    const name = getClosestColorName(r, g, b);
    setHistory(prev => [{ hex, name }, ...prev.slice(0, 19)]);
  }, []);

  const publishColor = useCallback((rgb: RGBColor) => {
    console.log('ColorDataContext: publishColor called. Subscribers count:', newColorSubscribers.current.size);
    newColorSubscribers.current.forEach((callback) => { // Removed unused 'indexOrValue'
      console.log('ColorDataContext: Notifying subscriber with RGB:', rgb, 'Subscriber:', callback);
      try {
        callback(rgb);
      } catch (error) {
        console.error('ColorDataContext: Error calling subscriber callback:', error, 'Subscriber:', callback);
      }
    });
  }, []);

  const addReceivedData = useCallback((value: string) => {
    console.log("ColorDataContext: Received data:", value);
    let parsed = value;
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      const [r, g, b] = hexToRgb(value);
      const name = getClosestColorName(r, g, b);
      parsed = `${value} → ${name}`;
      setLatestReceivedColor({ r, g, b });
      console.log("ColorDataContext: Calling publishColor with:", { r, g, b });
      publishColor({ r, g, b });
      addHistoryItem(value);
    } else {
      setLatestReceivedColor(null);
    }
    setReceivedData(prev => [parsed, ...prev.slice(0, 49)]);
  }, [addHistoryItem, publishColor]);

  const addSentData = useCallback((value: string) => {
    setSentData(prev => [value, ...prev.slice(0, 49)]);
  }, []);

  const clearReceivedData = useCallback(() => {
    setReceivedData([]);
    localStorage.removeItem("receivedData");
  }, []);

  const subscribeToNewColor = useCallback((callback: ColorSubscriber) => {
    const id = Math.random().toString(36).substring(7);
    console.log(`ColorDataContext: Subscribing new color callback with ID: ${id}`, callback);
    newColorSubscribers.current.add(callback);
    console.log("ColorDataContext: Current subscribers count:", newColorSubscribers.current.size);
    return () => {
      newColorSubscribers.current.delete(callback);
      console.log(`ColorDataContext: Unsubscribing color callback with ID: ${id}. Current subscribers count:`, newColorSubscribers.current.size);
    };
  }, []);

  const value = {
    history,
    receivedData,
    sentData,
    latestReceivedColor,
    addHistoryItem,
    addReceivedData,
    addSentData,
    clearReceivedData,
    subscribeToNewColor,
  };

  return (
    <ColorDataContext.Provider value={value}>
      {children}
    </ColorDataContext.Provider>
  );
};

export const useColorContext = () => {
  const context = useContext(ColorDataContext);
  if (context === undefined) {
    throw new Error('useColorContext must be used within a ColorDataProvider');
  }
  return context;
};
