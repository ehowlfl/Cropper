import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Clock } from 'lucide-react';

interface ColorHistoryItem {
  hex: string;
  name: string;
}

interface ColorHistoryProps {
  history: ColorHistoryItem[];
}

export function ColorHistory({ history }: ColorHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} />
          <h2 className="text-lg font-semibold">Color History</h2>
        </div>
        <p className="text-muted-foreground text-sm">No colors in history yet</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} />
        <h2 className="text-lg font-semibold">Color History</h2>
      </div>
      <Separator className="my-2" />
      <ScrollArea className="h-48">
        <AnimatePresence>
          <div className="space-y-2">
            {history.map((entry, index) => (
              <motion.div
                key={`${entry.hex}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 p-2 rounded-md border bg-card"
              >
                <div 
                  className="w-8 h-8 rounded-md" 
                  style={{ backgroundColor: entry.hex }}
                />
                <div className="flex-1">
                  <div className="font-medium">{entry.name}</div>
                  <div className="text-xs text-muted-foreground">{entry.hex}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}