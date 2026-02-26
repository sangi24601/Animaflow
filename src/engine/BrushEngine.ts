import { Point, BrushSettings, ToolType } from './types';

export class BrushEngine {
  private points: Point[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  startStroke(point: Point, settings: BrushSettings) {
    this.points = [point];
    if (settings.tool === ToolType.Fill) {
      this.floodFill(Math.round(point.x), Math.round(point.y), settings.color);
    }
  }

  addPoint(point: Point, settings: BrushSettings) {
    if (settings.tool === ToolType.Fill || settings.tool === ToolType.Select) return;
    
    this.points.push(point);
    
    this.ctx.save();
    if (settings.tool === ToolType.Eraser) {
      this.ctx.globalCompositeOperation = 'destination-out';
    }

    if (this.points.length < 4) {
      this.drawSimpleLine(settings);
    } else {
      this.drawSpline(settings);
    }
    this.ctx.restore();
  }

  private drawSimpleLine(settings: BrushSettings) {
    if (this.points.length < 2) return;
    const p1 = this.points[this.points.length - 2];
    const p2 = this.points[this.points.length - 1];
    
    this.ctx.beginPath();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = settings.color;
    this.ctx.lineWidth = settings.size * p2.pressure;
    this.ctx.moveTo(p1.x, p1.y);
    this.ctx.lineTo(p2.x, p2.y);
    this.ctx.stroke();
  }

  private drawSpline(settings: BrushSettings) {
    const len = this.points.length;
    const p0 = this.points[len - 4];
    const p1 = this.points[len - 3];
    const p2 = this.points[len - 2];
    const p3 = this.points[len - 1];

    const alpha = 0.5;
    const getT = (t: number, pA: Point, pB: Point) => {
      const d = Math.pow(Math.pow(pB.x - pA.x, 2) + Math.pow(pB.y - pA.y, 2), 0.5);
      return Math.pow(d, alpha) + t;
    };

    const t0 = 0;
    const t1 = getT(t0, p0, p1);
    const t2 = getT(t1, p1, p2);
    const t3 = getT(t2, p2, p3);

    this.ctx.beginPath();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = settings.color;
    
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = t1 + (i / steps) * (t2 - t1);
      
      const a1x = (t1 - t) / (t1 - t0) * p0.x + (t - t0) / (t1 - t0) * p1.x;
      const a1y = (t1 - t) / (t1 - t0) * p0.y + (t - t0) / (t1 - t0) * p1.y;
      const a2x = (t2 - t) / (t2 - t1) * p1.x + (t - t1) / (t2 - t1) * p2.x;
      const a2y = (t2 - t) / (t2 - t1) * p1.y + (t - t1) / (t2 - t1) * p2.y;
      const a3x = (t3 - t) / (t3 - t2) * p2.x + (t - t2) / (t3 - t2) * p3.x;
      const a3y = (t3 - t) / (t3 - t2) * p2.y + (t - t2) / (t3 - t2) * p3.y;

      const b1x = (t2 - t) / (t2 - t0) * a1x + (t - t0) / (t2 - t0) * a2x;
      const b1y = (t2 - t) / (t2 - t0) * a1y + (t - t0) / (t2 - t0) * a2y;
      const b2x = (t3 - t) / (t3 - t1) * a2x + (t - t1) / (t3 - t1) * a3x;
      const b2y = (t3 - t) / (t3 - t1) * a2y + (t - t1) / (t3 - t1) * a3y;

      const cx = (t2 - t) / (t2 - t1) * b1x + (t - t1) / (t2 - t1) * b2x;
      const cy = (t2 - t) / (t2 - t1) * b1y + (t - t1) / (t2 - t1) * b2y;

      const pressure = p1.pressure + (i / steps) * (p2.pressure - p1.pressure);
      this.ctx.lineWidth = settings.size * pressure;

      if (i === 0) {
        this.ctx.moveTo(cx, cy);
      } else {
        this.ctx.lineTo(cx, cy);
      }
    }
    this.ctx.stroke();
  }

  private floodFill(startX: number, startY: number, fillColor: string) {
    const canvas = this.ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    const imageData = this.ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const getPixel = (x: number, y: number) => {
      const i = (y * width + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    };

    const targetColor = getPixel(startX, startY);
    const fillRgb = this.hexToRgb(fillColor);
    if (!fillRgb) return;

    if (this.colorsMatch(targetColor, [fillRgb.r, fillRgb.g, fillRgb.b, 255])) return;

    const stack: [number, number][] = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const i = (y * width + x) * 4;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (!this.colorsMatch(getPixel(x, y), targetColor)) continue;

      data[i] = fillRgb.r;
      data[i + 1] = fillRgb.g;
      data[i + 2] = fillRgb.b;
      data[i + 3] = 255;

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private colorsMatch(c1: number[], c2: number[]) {
    return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
  }

  endStroke() {
    this.points = [];
  }
}
