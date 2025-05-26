import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getClosestColorName, hexToRgb } from '../../lib/colorUtils';

interface ColorPickerProps {
  onColorSelected: (hex: string) => void;
}

export function ColorPicker({ onColorSelected }: ColorPickerProps) {
  const [color, setColor] = useState('#ffffff');
  const [colorName, setColorName] = useState('White');
  
  const updateColorInfo = useCallback((hex: string) => {
    setColor(hex);
    const [r, g, b] = hexToRgb(hex);
    const name = getClosestColorName(r, g, b);
    setColorName(name);
  }, []);

  useEffect(() => {
    onColorSelected(color);
  }, [color, onColorSelected]);

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    updateColorInfo(hex);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <motion.div 
            className="w-full h-32 transition-colors duration-300 ease-in-out"
            style={{ backgroundColor: color }}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
          <div className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="md:w-1/2">
                <Label htmlFor="hex-input" className="text-sm font-medium mb-1 block">
                  Color (HEX)
                </Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="color" 
                    value={color} 
                    onChange={handleColorInput} 
                    id="color-picker"
                    className="w-10 h-10 p-0 border-none cursor-pointer"
                  />
                  <Input 
                    type="text" 
                    value={color} 
                    onChange={handleColorInput} 
                    id="hex-input"
                    className="flex-1"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              
              <div className="md:w-1/2">
                <div className="text-sm font-medium mb-1 block">
                  Closest Color Name
                </div>
                <div className="text-xl font-semibold h-10 flex items-center">
                  {colorName}
                </div>
              </div>
            </div>
            
            <motion.div 
              className="text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              RGB: {hexToRgb(color).join(', ')}
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}