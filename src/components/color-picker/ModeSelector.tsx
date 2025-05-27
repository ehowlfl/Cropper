import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowDownToLine, Sliders, Brain } from 'lucide-react';

interface ModeSelectorProps {
  mode: 'data' | 'control' | 'ai';
  onChange: (mode: 'data' | 'control' | 'ai') => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Tabs 
        value={mode} 
        onValueChange={(value) => onChange(value as 'data' | 'control' | 'ai')}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="data" className="flex items-center gap-2">
            <ArrowDownToLine size={16} />
            <span>Data Mode</span>
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Sliders size={16} />
            <span>Control Mode</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain size={16} />
            <span>AI Mode</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </motion.div>
  );
}