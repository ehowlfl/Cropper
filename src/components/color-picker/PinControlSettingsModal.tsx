import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Palette } from 'lucide-react';
import { usePinControlRules, PinControlRule } from '../../contexts/PinControlRulesContext';
import { useToast } from "../../hooks/use-toast"; // Updated import path

// Exporting the interface
export interface PinControlSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPickColorFromDevice: (callback: (rgb: { r: number; g: number; b: number }) => void) => void;
  initialRule?: PinControlRule | null; // Optional: rule to edit
  isPickingColor: boolean;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
  onRuleSet: (rule: { id: string, color: { r: number, g: number, b: number }, pinNumber: number, pinState: 'HIGH' | 'LOW' }) => void;
}

export function PinControlSettingsModal({ isOpen, onClose, onPickColorFromDevice, initialRule, isPickingColor, writer, onRuleSet }: PinControlSettingsModalProps) {
  const [colorR, setColorR] = useState('');
  const [colorG, setColorG] = useState('');
  const [colorB, setColorB] = useState('');
  const [pinNumber, setPinNumber] = useState('');
  const [pinState, setPinState] = useState<'HIGH' | 'LOW'>('HIGH'); // Default to HIGH

  const { addRule, updateRule } = usePinControlRules();
  const [ruleId, setRuleId] = useState<string | null>(null);
  const { toast } = useToast(); // Call useToast hook

  const colorPickCallback = useCallback((rgb: { r: number; g: number; b: number }) => {
    console.log('PinControlSettingsModal: colorPickCallback invoked with RGB:', rgb);
    console.log("Received RGB in modal:", rgb);
    setColorR(rgb.r.toString());
    setColorG(rgb.g.toString());
    setColorB(rgb.b.toString());
  }, [setColorR, setColorG, setColorB]);

  const handlePickColor = () => {
    console.log('PinControlSettingsModal: "Pick Color from Device" button clicked.');
    onPickColorFromDevice(colorPickCallback);
  };

  const handleSave = async () => {
    const r = parseInt(colorR);
    const g = parseInt(colorG);
    const b = parseInt(colorB);
    const pn = parseInt(pinNumber);

    // 간단한 유효성 검사
    if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(pn) ||
        r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255 ||
        pn < 0 /* 아두이노 핀 번호 범위에 맞게 조정 */ ) {
      toast({
        variant: "destructive",
        title: "유효성 검사 오류",
        description: "RGB (0-255) 및 핀 번호 (예: 0-13)에 유효한 숫자를 입력하세요.",
      });
      return;
    }

    if (!pinNumber) {
      toast({
        variant: "destructive",
        title: "핀 미선택",
        description: "제어할 핀을 선택하세요.",
      });
      return;
    }

    const pnValid = parseInt(pinNumber, 10);
    if (isNaN(pnValid) || ![2, 3, 4].includes(pnValid)) {
      console.error('Invalid pin number selected:', pinNumber);
      toast({
        variant: "destructive",
        title: "잘못된 핀",
        description: "유효한 핀 번호 (2, 3 또는 4)를 선택하세요.",
      });
      return;
    }

    let currentRuleId = ruleId;
    if (!currentRuleId) {
      currentRuleId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('PinControlSettingsModal: Generated new ruleId:', currentRuleId);
    }

    const ruleData = {
      color: { r, g, b },
      pinNumber: pn,
      pinState: pinState,
    };

    if (ruleId) {
      updateRule(ruleId, ruleData);
      toast({
        title: "규칙 업데이트됨",
        description: `규칙 ${ruleId}이(가) 성공적으로 업데이트되었습니다.`,
      });
    } else {
      addRule(ruleData);
      toast({
        title: "규칙 추가됨",
        description: `규칙이 성공적으로 추가되었습니다.`,
      });
    }

    if (writer) {
      const ruleToSend = {
        id: currentRuleId,
        colorR: r,
        colorG: g,
        colorB: b,
        pinNumber: pn,
        pinState: pinState,
      };

      const ruleCommandString = `RULE:${JSON.stringify(ruleToSend)}`;
      console.log(`PinControlSettingsModal: Preparing RULE command: ${ruleCommandString}`); // 전송 직전 로그 추가
      const textEncoder = new TextEncoder();
      try {
        // 대괄호 [] 다시 추가
        await writer.write(textEncoder.encode(`[${ruleCommandString}]\n`)); 
        console.log(`PinControlSettingsModal: Sent RULE command to Arduino: [${ruleCommandString}]`);
        toast({
          title: "명령 전송됨",
          description: "규칙 명령이 아두이노로 전송되었습니다.",
        });

        if (onRuleSet) {
          onRuleSet({ 
            id: currentRuleId, 
            color: { r, g, b }, 
            pinNumber: pn, 
            pinState: pinState 
          });
        }

      } catch (error) {
        console.error('Error sending command to Arduino:', error);
        toast({
          variant: "destructive",
          title: "명령 전송 오류",
          description: `명령 전송 중 오류: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    } else {
      console.error('Serial writer not available for RULE command. Is HC-06 connected?');
      toast({
        variant: "destructive",
        title: "HC-06 연결 오류",
        description: "HC-06이 연결되지 않았거나 RULE에 대한 쓰기 도구가 준비되지 않았습니다. 연결하고 다시 시도하세요.",
      });
    }

    onClose();
  };

  useEffect(() => {
    if (initialRule) {
      setRuleId(initialRule.id);
      setColorR(String(initialRule.color.r));
      setColorG(String(initialRule.color.g));
      setColorB(String(initialRule.color.b));
      setPinNumber(String(initialRule.pinNumber));
      setPinState(initialRule.pinState);
    } else {
      // Reset form when adding a new rule
      setRuleId(null); // 명시적으로 null로 설정하여 새 ID 생성 유도
      setColorR("0");
      setColorG("0");
      setColorB("0");
      setPinNumber(""); // 또는 기본 핀 (예: "2")
      setPinState("LOW");
    }
  }, [initialRule, isOpen]); // isOpen 추가: 모달이 다시 열릴 때 initialRule에 따라 상태 재설정

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialRule ? '핀 제어 규칙 편집' : '핀 제어 설정'}</DialogTitle>
          <DialogDescription>
            인식된 색상을 기반으로 자동 핀 제어 조건을 설정합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end mb-4">
          <Button
            variant="outline"
            onClick={handlePickColor}
            disabled={isPickingColor}
            className="flex items-center gap-2"
          >
            <Palette size={16} />
            <span>{isPickingColor ? '색상 선택 중...' : '장치에서 색상 선택'}</span>
          </Button>
        </div>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="colorR" className="text-right">색상 R</Label>
            <Input id="colorR" value={colorR} onChange={(e) => setColorR(e.target.value)} className="col-span-3" type="number" min="0" max="255" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="colorG" className="text-right">색상 G</Label>
            <Input id="colorG" value={colorG} onChange={(e) => setColorG(e.target.value)} className="col-span-3" type="number" min="0" max="255" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="colorB" className="text-right">색상 B</Label>
            <Input id="colorB" value={colorB} onChange={(e) => setColorB(e.target.value)} className="col-span-3" type="number" min="0" max="255" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pinNumber" className="text-right">핀 번호</Label>
            <Select onValueChange={setPinNumber} value={pinNumber}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="핀 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Pin 2</SelectItem>
                <SelectItem value="3">Pin 3</SelectItem>
                <SelectItem value="4">Pin 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pinState" className="text-right">핀 상태</Label>
            <Select onValueChange={(value: 'HIGH' | 'LOW') => setPinState(value)} value={pinState}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HIGH">HIGH</SelectItem>
                <SelectItem value="LOW">LOW</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>{initialRule ? '변경사항 저장' : '규칙 추가'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
