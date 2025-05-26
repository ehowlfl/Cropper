import { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface PinControlRule {
  id: string;
  color: { r: number; g: number; b: number };
  pinNumber: number;
  pinState: 'HIGH' | 'LOW';
  threshold?: number; // Optional: for 'similar' color matching
}

interface PinControlRulesContextType {
  rules: PinControlRule[];
  addRule: (rule: Omit<PinControlRule, 'id'>) => void;
  updateRule: (id: string, updatedRule: Omit<PinControlRule, 'id'>) => void;
  deleteRule: (id: string) => void;
}

const PinControlRulesContext = createContext<PinControlRulesContextType | undefined>(undefined);

interface PinControlRulesProviderProps {
  children: ReactNode;
}

export function PinControlRulesProvider({ children }: PinControlRulesProviderProps) {
  const [rules, setRules] = useState<PinControlRule[]>([]);

  const addRule = useCallback((newRule: Omit<PinControlRule, 'id'>) => {
    setRules(prevRules => [...prevRules, { ...newRule, id: uuidv4() }]);
  }, []);

  const updateRule = useCallback((id: string, updatedRule: Omit<PinControlRule, 'id'>) => {
    setRules(prevRules =>
      prevRules.map(rule => (rule.id === id ? { ...updatedRule, id } : rule))
    );
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prevRules => prevRules.filter(rule => rule.id !== id));
  }, []);

  return (
    <PinControlRulesContext.Provider value={{ rules, addRule, updateRule, deleteRule }}>
      {children}
    </PinControlRulesContext.Provider>
  );
}

export function usePinControlRules() {
  const context = useContext(PinControlRulesContext);
  if (context === undefined) {
    throw new Error('usePinControlRules must be used within a PinControlRulesProvider');
  }
  return context;
}
