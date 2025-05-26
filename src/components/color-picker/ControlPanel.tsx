import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  Zap,
  ZapOff,
  RefreshCw,
  Send,
  Sliders,
  Settings
} from 'lucide-react';
import { toast } from 'sonner'; 
import { PinControlSettingsModal, PinControlSettingsModalProps } from './PinControlSettingsModal'; 
import { useColorContext } from '../../contexts/ColorDataContext';
import { usePinControlRules, PinControlRule } from '../../contexts/PinControlRulesContext';

type ModalRuleSetPayload = Parameters<PinControlSettingsModalProps['onRuleSet']>[0];

interface ControlPanelProps {
  sendCommand: (command: string) => Promise<void>;
  isConnected: boolean;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
}

export function ControlPanel({ sendCommand, isConnected, writer }: ControlPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PinControlRule | undefined>(undefined);
  const { subscribeToNewColor } = useColorContext();
  const { rules, addRule, updateRule, deleteRule } = usePinControlRules();

  const [isWaitingForColorPick, setIsWaitingForColorPick] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const latestCallbackRef = useRef<((rgb: { r: number; g: number; b: number }) => void) | null>(null);

  const handleSendCommand = async (command: string) => {
    if (!isConnected) {
      toast.error("Not connected to any device");
      return;
    }

    setIsSending(true);
    try {
      await sendCommand(command);
      toast.success(`Command sent: ${command}`);
    } catch (error) {
      toast.error(`Failed to send command: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSending(false);
    }
  };

  const handlePickColorFromDevice = useCallback((callback: (rgb: { r: number; g: number; b: number }) => void) => {
    setIsWaitingForColorPick(true);
    toast.info("Waiting for new color data from device...");
    latestCallbackRef.current = callback;
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    const subscriberCallback = (rgb: { r: number; g: number; b: number }) => {
      if (latestCallbackRef.current) {
        latestCallbackRef.current(rgb);
      }
      setIsWaitingForColorPick(false); 
    };
    unsubscribeRef.current = subscribeToNewColor(subscriberCallback);
  }, [subscribeToNewColor]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isModalOpen && unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      setIsWaitingForColorPick(false);
    }
  }, [isModalOpen]);

  const handleEditRule = (rule: PinControlRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDeleteRule = (id: string) => {
    deleteRule(id);
    toast.success('Rule deleted successfully!');
  };

  const handleRuleSet = (ruleData: ModalRuleSetPayload) => {
    const newOrUpdatedRule: PinControlRule = {
        id: ruleData.id, 
        color: ruleData.color,
        pinNumber: ruleData.pinNumber,
        pinState: ruleData.pinState,
    };

    const existingRule = rules.find(r => r.id === newOrUpdatedRule.id);
    if (existingRule) {
      updateRule(newOrUpdatedRule.id, newOrUpdatedRule);
      toast.success('Rule updated successfully!');
    } else {
      addRule(newOrUpdatedRule);
      toast.success('New rule added successfully!');
    }
    setIsModalOpen(false); 
    setEditingRule(undefined); 
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardContent className="p-6">
           <div className="flex items-center gap-2 mb-4">
             <Sliders size={18} />
             <h2 className="text-xl font-semibold">Control Commands</h2>
           </div>

           <div className="grid grid-cols-2 gap-3">
             <Button
              variant="default"
              onClick={() => handleSendCommand("COLOR")}
              className="flex items-center gap-2"
              disabled={isSending || !isConnected}
            >
               <Send size={16} />
               <span>Send Color</span>
             </Button>

             <Button
              variant="default"
              onClick={() => handleSendCommand("ON")}
              className="flex items-center gap-2"
              disabled={isSending || !isConnected}
            >
               <Zap size={16} />
               <span>LED ON</span>
             </Button>

             <Button
              variant="default"
              onClick={() => handleSendCommand("OFF")}
              className="flex items-center gap-2"
              disabled={isSending || !isConnected}
            >
               <ZapOff size={16} />
               <span>LED OFF</span>
             </Button>

             <Button
              variant="default"
              onClick={() => handleSendCommand("MODE:CONTROL")}
              className="flex items-center gap-2"
              disabled={isSending || !isConnected}
            >
               <RefreshCw size={16} />
               <span>Reset Device</span>
             </Button>

            <Button
              variant="outline"
              onClick={() => {
                setEditingRule(undefined); 
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 col-span-2"
            >
              <Settings size={16} />
              <span>Configure Auto Pin Control</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} />
            <h2 className="text-xl font-semibold">Saved Auto Pin Control Rules</h2>
          </div>
          {rules.length === 0 ? (
            <p className="text-gray-400">No rules saved yet. Configure a new rule above.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <CardContent>
                    <p><strong>Color:</strong> <span style={{ backgroundColor: `rgb(${rule.color.r},${rule.color.g},${rule.color.b})`, padding: '2px 8px', borderRadius: '4px', color: 'white', textShadow: '0 0 2px black' }}>RGB({rule.color.r}, {rule.color.g}, {rule.color.b})</span></p>
                    <p><strong>Pin:</strong> {rule.pinNumber}</p>
                    <p><strong>State:</strong> {rule.pinState}</p>
                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="outline" size="sm" onClick={() => handleEditRule(rule)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PinControlSettingsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(undefined);
        }}
        onPickColorFromDevice={handlePickColorFromDevice}
        initialRule={editingRule}
        isPickingColor={isWaitingForColorPick}
        writer={writer}
        onRuleSet={handleRuleSet} 
      />
    </motion.div>
  );
}