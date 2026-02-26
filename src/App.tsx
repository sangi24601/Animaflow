import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StorageManager } from './engine/StorageManager';
import { BrushEngine } from './engine/BrushEngine';
import { AnimationLoop } from './engine/AnimationLoop';
import { Frame, LayerType, Point, BrushSettings, ToolType } from './engine/types';
import { Toolbar } from './components/Toolbar';
import { Timeline } from './components/Timeline';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Play, Pause, Plus, Trash2, ChevronRight, ChevronLeft, Settings2, Undo2, Redo2, Copy } from 'lucide-react';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export default function App() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<LayerType>(LayerType.Lineart);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    tool: ToolType.Brush,
    size: 5,
    color: '#000000',
    opacity: 1,
    smoothing: 0.5
  });
  const [onionSkinning, setOnionSkinning] = useState({ enabled: true, opacity: 0.3 });
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [undoStack, setUndoStack] = useState<(Blob | null)[]>([]);
  const [redoStack, setRedoStack] = useState<(Blob | null)[]>([]);

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionPrevCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionNextCanvasRef = useRef<HTMLCanvasElement>(null);
  const layerCanvasesRef = useRef<{ [key in LayerType]: HTMLCanvasElement | null }>({
    [LayerType.Background]: null,
    [LayerType.Lineart]: null,
    [LayerType.Color]: null
  });

  const storageManager = useRef(new StorageManager());
  const brushEngine = useRef<BrushEngine | null>(null);
  const animationLoop = useRef<AnimationLoop | null>(null);
  const frameCache = useRef<Map<string, ImageData>>(new Map());

  // Initialize DB and first frame
  useEffect(() => {
    const init = async () => {
      await storageManager.current.init();
      const storedFrames = await storageManager.current.getAllFrames();
      if (storedFrames.length === 0) {
        const firstFrame = createNewFrame(0);
        setFrames([firstFrame]);
        await storageManager.current.saveFrame(firstFrame);
      } else {
        setFrames(storedFrames.sort((a, b) => a.index - b.index));
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (mainCanvasRef.current) {
      const ctx = mainCanvasRef.current.getContext('2d', { desynchronized: true });
      if (ctx) brushEngine.current = new BrushEngine(ctx);
    }
    animationLoop.current = new AnimationLoop((index) => {
      setCurrentFrameIndex(index);
    });
  }, []);

  useEffect(() => {
    if (animationLoop.current) {
      animationLoop.current.setFPS(fps);
      animationLoop.current.setTotalFrames(frames.length);
    }
  }, [fps, frames.length]);

  const createNewFrame = (index: number): Frame => {
    const id = crypto.randomUUID();
    return {
      id,
      index,
      layers: {
        [LayerType.Background]: crypto.randomUUID(),
        [LayerType.Lineart]: crypto.randomUUID(),
        [LayerType.Color]: crypto.randomUUID()
      }
    };
  };

  const addFrame = async () => {
    const newFrame = createNewFrame(frames.length);
    const newFrames = [...frames, newFrame];
    setFrames(newFrames);
    await storageManager.current.saveFrame(newFrame);
    setCurrentFrameIndex(newFrames.length - 1);
  };

  const duplicateFrame = async (index: number) => {
    const sourceFrame = frames[index];
    if (!sourceFrame) return;

    const newFrame = createNewFrame(index + 1);
    
    // Copy layers in DB
    await storageManager.current.copyLayer(sourceFrame.layers[LayerType.Background], newFrame.layers[LayerType.Background]);
    await storageManager.current.copyLayer(sourceFrame.layers[LayerType.Lineart], newFrame.layers[LayerType.Lineart]);
    await storageManager.current.copyLayer(sourceFrame.layers[LayerType.Color], newFrame.layers[LayerType.Color]);

    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, newFrame);
    
    // Re-index
    const reindexedFrames = newFrames.map((f, i) => ({ ...f, index: i }));
    setFrames(reindexedFrames);
    
    await storageManager.current.saveFrame(newFrame);
    setCurrentFrameIndex(index + 1);
  };

  const deleteFrame = async (index: number) => {
    if (frames.length <= 1) return;
    const frameToDelete = frames[index];
    if (!frameToDelete) return;

    const newFrames = frames.filter((_, i) => i !== index).map((f, i) => ({ ...f, index: i }));
    setFrames(newFrames);
    
    if (frameToDelete.layers) {
      await storageManager.current.deleteLayer(frameToDelete.layers[LayerType.Background]);
      await storageManager.current.deleteLayer(frameToDelete.layers[LayerType.Lineart]);
      await storageManager.current.deleteLayer(frameToDelete.layers[LayerType.Color]);
    }
    
    if (currentFrameIndex >= newFrames.length) {
      setCurrentFrameIndex(Math.max(0, newFrames.length - 1));
    }
  };

  const loadFrameToCanvas = useCallback(async (index: number) => {
    const frame = frames[index];
    if (!frame) return;

    const ctx = mainCanvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Composite layers
    for (const type of [LayerType.Background, LayerType.Color, LayerType.Lineart]) {
      if (!frame.layers) continue;
      const layerId = frame.layers[type as LayerType];
      let imgData = frameCache.current.get(layerId);

      if (!imgData) {
        const blob = await storageManager.current.getLayer(layerId);
        if (blob) {
          const img = await createImageBitmap(blob);
          ctx.drawImage(img, 0, 0);
          // Cache logic: only keep neighbors in RAM
          // For simplicity in this demo, we'll just draw it
        }
      } else {
        ctx.putImageData(imgData, 0, 0);
      }
    }

    // Onion skinning
    if (onionSkinning.enabled && !isPlaying) {
      renderOnionSkin(index);
    }
  }, [frames, onionSkinning.enabled, isPlaying]);

  const renderOnionSkin = async (index: number) => {
    const prevIdx = index - 1;
    const nextIdx = index + 1;

    const drawTinted = async (idx: number, canvas: HTMLCanvasElement | null, color: string) => {
      if (!canvas || idx < 0 || idx >= frames.length) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const frame = frames[idx];
      
      // Create a temporary canvas for tinting
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = CANVAS_WIDTH;
      tempCanvas.height = CANVAS_HEIGHT;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      for (const type of [LayerType.Background, LayerType.Color, LayerType.Lineart]) {
        if (!frame.layers) continue;
        const layerId = frame.layers[type as LayerType];
        const blob = await storageManager.current.getLayer(layerId);
        if (blob) {
          const img = await createImageBitmap(blob);
          tempCtx.drawImage(img, 0, 0);
        }
      }

      // Apply tint
      ctx.save();
      ctx.globalAlpha = onionSkinning.opacity;
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    };

    await drawTinted(prevIdx, onionPrevCanvasRef.current, '#ff0000'); // Red for previous
    await drawTinted(nextIdx, onionNextCanvasRef.current, '#0000ff'); // Blue for next
  };

  useEffect(() => {
    loadFrameToCanvas(currentFrameIndex);
    setUndoStack([]);
    setRedoStack([]);
  }, [currentFrameIndex, loadFrameToCanvas]);

  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, [activeLayer]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isPlaying) return;
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point: Point = {
      x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
      pressure: e.pressure || 0.5,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      timestamp: Date.now()
    };

    // Start stroke immediately for responsiveness
    brushEngine.current?.startStroke(point, brushSettings);
    mainCanvasRef.current?.setPointerCapture(e.pointerId);

    // Save state for undo in background
    const frame = frames[currentFrameIndex];
    if (frame && frame.layers) {
      storageManager.current.getLayer(frame.layers[activeLayer]).then(currentBlob => {
        setUndoStack(prev => [...prev.slice(-19), currentBlob]); // Keep last 20, null is okay
        setRedoStack([]); // Clear redo on new action
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPlaying || !e.buttons) return;
    const rect = mainCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point: Point = {
      x: (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
      pressure: e.pressure || 0.5,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      timestamp: Date.now()
    };

    brushEngine.current?.addPoint(point, brushSettings);
  };

  const handlePointerUp = async () => {
    brushEngine.current?.endStroke();
    // Save current state to IndexedDB
    const ctx = mainCanvasRef.current?.getContext('2d');
    if (ctx) {
      mainCanvasRef.current?.toBlob(async (blob) => {
        if (blob) {
          const frame = frames[currentFrameIndex];
          if (frame && frame.layers) {
            await storageManager.current.saveLayer(frame.layers[activeLayer], blob);
          }
        }
      }, 'image/png');
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      animationLoop.current?.stop();
    } else {
      animationLoop.current?.start(currentFrameIndex);
    }
    setIsPlaying(!isPlaying);
  };

  const undo = async () => {
    if (undoStack.length === 0) return;
    const frame = frames[currentFrameIndex];
    if (!frame || !frame.layers) return;

    const prevBlob = undoStack[undoStack.length - 1];
    const currentBlob = await storageManager.current.getLayer(frame.layers[activeLayer]);
    
    setRedoStack(prev => [...prev, currentBlob]);
    setUndoStack(prev => prev.slice(0, -1));

    if (prevBlob) {
      await storageManager.current.saveLayer(frame.layers[activeLayer], prevBlob);
    } else {
      await storageManager.current.deleteLayer(frame.layers[activeLayer]);
    }
    
    await loadFrameToCanvas(currentFrameIndex);
  };

  const redo = async () => {
    if (redoStack.length === 0) return;
    const frame = frames[currentFrameIndex];
    if (!frame || !frame.layers) return;

    const nextBlob = redoStack[redoStack.length - 1];
    const currentBlob = await storageManager.current.getLayer(frame.layers[activeLayer]);
    
    setUndoStack(prev => [...prev, currentBlob]);
    setRedoStack(prev => prev.slice(0, -1));

    if (nextBlob) {
      await storageManager.current.saveLayer(frame.layers[activeLayer], nextBlob);
    } else {
      await storageManager.current.deleteLayer(frame.layers[activeLayer]);
    }
    
    await loadFrameToCanvas(currentFrameIndex);
  };

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col overflow-hidden font-sans text-white">
      {/* Header / Top Bar */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#121212] z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-tighter text-emerald-500">ANIMAFlow</h1>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>Frame {currentFrameIndex + 1} / {frames.length}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <button 
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-20 transition-colors"
              title="Undo"
            >
              <Undo2 size={18} />
            </button>
            <button 
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 hover:bg-white/5 rounded-lg disabled:opacity-20 transition-colors"
              title="Redo"
            >
              <Redo2 size={18} />
            </button>
          </div>
          <button 
            onClick={togglePlayback}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-full transition-colors font-medium text-sm"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <div className="h-6 w-px bg-white/10 mx-2" />
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1">
            <span className="text-xs text-white/40 uppercase font-bold tracking-widest">FPS</span>
            <select 
              value={fps} 
              onChange={(e) => setFps(Number(e.target.value))}
              className="bg-transparent text-sm focus:outline-none cursor-pointer"
            >
              {[1, 2, 5, 8, 12, 15, 24, 30].map(f => (
                <option key={f} value={f} className="bg-[#1a1a1a]">{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Left Toolbar */}
        <motion.div 
          initial={false}
          animate={{ width: isToolbarCollapsed ? 60 : 240 }}
          className="bg-[#121212] border-r border-white/10 flex flex-col z-40"
        >
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            <Toolbar 
              collapsed={isToolbarCollapsed}
              settings={brushSettings}
              onSettingsChange={setBrushSettings}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
              onionSkinning={onionSkinning}
              onOnionSkinningChange={setOnionSkinning}
            />
          </div>
          <button 
            onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
            className="h-10 border-t border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            {isToolbarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </motion.div>

        {/* Main Canvas Area */}
        <div className="flex-1 bg-[#0a0a0a] relative flex items-center justify-center p-8 overflow-hidden">
          <div 
            className="relative shadow-2xl bg-white"
            style={{ 
              width: '100%', 
              maxWidth: '1280px', 
              aspectRatio: '16/9',
              maxHeight: 'calc(100vh - 240px)'
            }}
          >
            {/* Onion Skinning Canvases */}
            <canvas 
              ref={onionPrevCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
            />
            <canvas 
              ref={onionNextCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="absolute inset-0 w-full h-full pointer-events-none opacity-30"
            />
            
            {/* Main Interactive Canvas */}
            <canvas 
              ref={mainCanvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            />
          </div>
        </div>

        {/* Right Sidebar (Layers Quick View) */}
        {!isToolbarCollapsed && (
          <div className="w-64 bg-[#121212] border-l border-white/10 p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white/40 uppercase text-[10px] font-bold tracking-widest">
              <Layers size={12} />
              <span>Layers</span>
            </div>
            <div className="flex flex-col gap-2">
              {[LayerType.Lineart, LayerType.Color, LayerType.Background].map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveLayer(type)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                    activeLayer === type 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                      : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
                  }`}
                >
                  <span className="capitalize text-sm font-medium">{type}</span>
                  {activeLayer === type && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="h-40 bg-[#121212] border-t border-white/10 z-50">
        <Timeline 
          frames={frames}
          currentIndex={currentFrameIndex}
          onSelectFrame={setCurrentFrameIndex}
          onAddFrame={addFrame}
          onDeleteFrame={deleteFrame}
          onDuplicateFrame={duplicateFrame}
        />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
