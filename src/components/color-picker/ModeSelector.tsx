import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowDownToLine, Sliders } from 'lucide-react';

interface ModeSelectorProps {
  mode: 'data' | 'control';
  onChange: (mode: 'data' | 'control') => void;
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
        onValueChange={(value) => onChange(value as 'data' | 'control')}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="data" className="flex items-center gap-2">
            <ArrowDownToLine size={16} />
            <span>Data Mode</span>
          </TabsTrigger>
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Sliders size={16} />
            <span>Control Mode</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </motion.div>
  );
}