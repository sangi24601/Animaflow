export enum LayerType {
  Background = 'background',
  Lineart = 'lineart',
  Color = 'color'
}

export interface FrameLayer {
  id: string;
  type: LayerType;
  imageData?: ImageData; // Only present if in RAM cache
  blob?: Blob; // Stored form
}

export interface Frame {
  id: string;
  index: number;
  layers: {
    [key in LayerType]: string; // Layer ID
  };
}

export interface Point {
  x: number;
  y: number;
  pressure: number;
  tiltX: number;
  tiltY: number;
  timestamp: number;
}

export enum ToolType {
  Brush = 'brush',
  Eraser = 'eraser',
  Select = 'select',
  Fill = 'fill'
}

export interface BrushSettings {
  tool: ToolType;
  size: number;
  color: string;
  opacity: number;
  smoothing: number;
}
