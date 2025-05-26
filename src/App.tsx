import { ThemeProvider } from './components/providers/theme-provider';
import { Toaster } from './components/ui/sonner';
import { ColorPickerApp } from './components/ColorPickerApp';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="color-picker-theme">
      <div className="min-h-screen bg-background">
        <ColorPickerApp />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;