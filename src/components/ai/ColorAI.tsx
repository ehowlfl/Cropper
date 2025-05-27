import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

interface ColorAIProps {
  onSelectColor: (color: string) => void;
  isConnected: boolean;
}

export function ColorAI({ onSelectColor, isConnected }: ColorAIProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [recommendedColors, setRecommendedColors] = useState<string[]>([]);
  const [baseColor, setBaseColor] = useState('#FF5733');
  const [loading, setLoading] = useState(false);

  // 색상 추천 기능 - 실제 구현에서는 API 호출로 대체
  const getColorRecommendations = async () => {
    setLoading(true);
    try {
      // 실제 구현: API 호출
      // 여기서는 예시로 몇 가지 색상을 반환
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 색상 조합 알고리즘 예시 (실제로는 AI API를 사용)
      const getComplementaryColor = (hex: string) => {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // 보색 계산 (255 - 각 성분)
        const compR = 255 - r;
        const compG = 255 - g;
        const compB = 255 - b;
        
        return `#${compR.toString(16).padStart(2, '0')}${compG.toString(16).padStart(2, '0')}${compB.toString(16).padStart(2, '0')}`;
      };
      
      const getAnalogousColor = (hex: string, offset: number) => {
        hex = hex.replace('#', '');
        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);
        
        // 색상 휠에서 30도 회전 (단순화된 버전)
        r = (r + offset) % 256;
        g = (g + offset) % 256;
        b = (b + offset) % 256;
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      };
      
      const colors = [
        getComplementaryColor(baseColor),
        getAnalogousColor(baseColor, 30),
        getAnalogousColor(baseColor, 60)
      ];
      
      setRecommendedColors(colors);
      toast.success('AI color recommendations generated!');
    } catch (error) {
      console.error('Error getting color recommendations:', error);
      toast.error('Failed to generate color recommendations');
    } finally {
      setLoading(false);
    }
  };

  // 이미지에서 색상 추출 기능
  const extractColorsFromImage = async () => {
    if (!imageUrl) {
      toast.error('Please enter an image URL');
      return;
    }
    
    setLoading(true);
    try {
      // 실제 구현에서는 이미지 분석 API 호출
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 더미 데이터 (실제로는 이미지에서 추출)
      const mockColors = [
        '#2E86C1', '#17A589', '#D4AC0D', '#CA6F1E', '#884EA0'
      ];
      
      setRecommendedColors(mockColors.slice(0, 3));
      toast.success('Colors extracted from image!');
    } catch (error) {
      console.error('Error extracting colors:', error);
      toast.error('Failed to extract colors from image');
    } finally {
      setLoading(false);
    }
  };

  // 색상 분석 기능
  const analyzeColor = async (hexColor: string) => {
    setLoading(true);
    try {
      // 실제 구현에서는 색상 분석 API 호출
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 색상에 따른 설명 (예시)
      const colorDescriptions: Record<string, string> = {
        'red': 'Energetic and passionate',
        'blue': 'Calm and trustworthy',
        'green': 'Natural and balanced',
        'yellow': 'Optimistic and cheerful',
        'purple': 'Creative and luxurious'
      };
      
      // 간단한 색상 분류 (실제로는 더 복잡한 알고리즘 사용)
      const hex = hexColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      let colorName = '';
      if (r > g && r > b) colorName = 'red';
      else if (g > r && g > b) colorName = 'green';
      else if (b > r && b > g) colorName = 'blue';
      else if (r > 200 && g > 200) colorName = 'yellow';
      else if (r > 120 && b > 120) colorName = 'purple';
      
      const description = colorDescriptions[colorName] || 'Unique color';
      toast.info(`Color Analysis: ${description}`);
    } catch (error) {
      console.error('Error analyzing color:', error);
      toast.error('Failed to analyze color');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Color Assistant</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="recommend">
          <TabsList className="mb-4">
            <TabsTrigger value="recommend">Color Recommendations</TabsTrigger>
            <TabsTrigger value="extract">Extract from Image</TabsTrigger>
            <TabsTrigger value="analyze">Color Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="recommend">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI will suggest complementary and harmonious colors based on your selection
              </p>
              
              <div className="flex items-center gap-4">
                <div 
                  className="h-10 w-10 rounded-full border"
                  style={{ backgroundColor: baseColor }}
                />
                <Input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Button 
                  onClick={getColorRecommendations}
                  disabled={loading}
                  className="ml-2"
                >
                  {loading ? 'Loading...' : 'Get Recommendations'}
                </Button>
              </div>
              
              {recommendedColors.length > 0 && (
                <div className="mt-4 space-y-4">
                  <h3 className="text-lg font-medium">Recommended Colors</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {recommendedColors.map((color, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div 
                          className="h-20 w-full rounded-md cursor-pointer transition-transform hover:scale-105"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            onSelectColor(color);
                            toast.success(`Selected color: ${color}`);
                          }}
                        />
                        <span className="mt-1 text-xs">{color}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500">Click on any color to send to Arduino</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="extract">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Extract dominant colors from any image URL
              </p>
              
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={extractColorsFromImage}
                  disabled={!imageUrl || loading}
                >
                  Extract
                </Button>
              </div>
              
              {recommendedColors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium">Extracted Colors</h3>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {recommendedColors.map((color, idx) => (
                      <div key={idx} className="flex flex-col items-center">
                        <div 
                          className="h-20 w-full rounded-md cursor-pointer transition-transform hover:scale-105"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            onSelectColor(color);
                            toast.success(`Selected color: ${color}`);
                          }}
                        />
                        <span className="mt-1 text-xs">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analyze">
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get AI analysis of colors and their psychological effects
              </p>
              
              <div className="flex items-center gap-4">
                <div 
                  className="h-10 w-10 rounded-full border"
                  style={{ backgroundColor: baseColor }}
                />
                <Input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-16 h-10"
                />
                <Button 
                  onClick={() => analyzeColor(baseColor)}
                  disabled={loading}
                  className="ml-2"
                >
                  Analyze Color
                </Button>
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={() => onSelectColor(baseColor)}
                  disabled={!isConnected}
                  className="w-full"
                >
                  Send This Color to Arduino
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 