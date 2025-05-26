import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Trash2, Download } from 'lucide-react';

interface DataViewProps {
  receivedData: string[];
  clearReceivedData: () => void;
}

export function DataView({ receivedData, clearReceivedData }: DataViewProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Download size={16} />
          <h2 className="text-lg font-semibold">Received Data</h2>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearReceivedData}
          className="flex items-center gap-1"
          disabled={receivedData.length === 0}
        >
          <Trash2 size={14} />
          <span>Clear</span>
        </Button>
      </div>
      <Separator className="my-2" />
      
      <ScrollArea className="h-48">
        <AnimatePresence>
          {receivedData.length === 0 ? (
            <p className="text-muted-foreground text-sm p-2">No data received yet</p>
          ) : (
            <div className="space-y-2">
              {receivedData.map((msg, index) => (
                <motion.div
                  key={`${msg}-${index}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.2 }}
                  className="p-2 rounded-md bg-accent text-accent-foreground text-sm font-mono"
                >
                  {msg}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}