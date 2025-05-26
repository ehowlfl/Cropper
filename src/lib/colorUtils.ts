interface ColorDefinition {
  name: string;
  rgb: [number, number, number];
}

export const x11Colors: ColorDefinition[] = [
  { name: "Black", rgb: [0, 0, 0] },
  { name: "White", rgb: [255, 255, 255] },
  { name: "Red", rgb: [255, 0, 0] },
  { name: "Lime", rgb: [0, 255, 0] },
  { name: "Blue", rgb: [0, 0, 255] },
  { name: "Yellow", rgb: [255, 255, 0] },
  { name: "Cyan", rgb: [0, 255, 255] },
  { name: "Magenta", rgb: [255, 0, 255] },
  { name: "Gray", rgb: [128, 128, 128] },
  { name: "Orange", rgb: [255, 165, 0] },
  { name: "Pink", rgb: [255, 192, 203] },
  { name: "SkyBlue", rgb: [135, 206, 235] },
  { name: "Purple", rgb: [128, 0, 128] },
  { name: "Brown", rgb: [165, 42, 42] },
  { name: "Teal", rgb: [0, 128, 128] },
  { name: "Navy", rgb: [0, 0, 128] },
  { name: "Green", rgb: [0, 128, 0] },
  { name: "Olive", rgb: [128, 128, 0] },
  { name: "Maroon", rgb: [128, 0, 0] },
  { name: "Silver", rgb: [192, 192, 192] },
  { name: "Gold", rgb: [255, 215, 0] },
  { name: "Indigo", rgb: [75, 0, 130] },
  { name: "Violet", rgb: [238, 130, 238] }
];

export function getClosestColorName(r: number, g: number, b: number): string {
  let closest = null;
  let minDist = Infinity;

  x11Colors.forEach(color => {
    const [cr, cg, cb] = color.rgb;
    const dist = Math.pow(r - cr, 2) + Math.pow(g - cg, 2) + Math.pow(b - cb, 2);
    if (dist < minDist) {
      minDist = dist;
      closest = color.name;
    }
  });

  return closest || "Unknown";
}

export function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  
  // Parse the hex values
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}