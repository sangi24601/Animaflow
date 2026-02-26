import React, { useRef, useEffect } from 'react';
import { Frame } from '../engine/types';
import { Plus, Trash2, Play, SkipBack, SkipForward, Copy } from 'lucide-react';
import { motion } from 'motion/react';

interface TimelineProps {
  frames: Frame[];
  currentIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onDuplicateFrame: (index: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  frames,
  currentIndex,
  onSelectFrame,
  onAddFrame,
  onDeleteFrame,
  onDuplicateFrame
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[currentIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <button className="text-white/40 hover:text-white transition-colors"><SkipBack size={16} /></button>
          <button className="text-white/40 hover:text-white transition-colors"><SkipForward size={16} /></button>
        </div>
        <button 
          onClick={onAddFrame}
          className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          <Plus size={14} />
          Add Frame
        </button>
      </div>

      {/* Frames List */}
      <div 
        ref={scrollRef}
        className="flex-1 flex items-center gap-3 px-8 overflow-x-auto custom-scrollbar bg-[#0d0d0d]"
      >
        {frames.map((frame, index) => (
          <motion.div
            key={frame.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative group flex-shrink-0 w-32 aspect-video rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
              currentIndex === index 
                ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : 'border-white/10 hover:border-white/30'
            }`}
            onClick={() => onSelectFrame(index)}
          >
            {/* Frame Content Preview (Placeholder) */}
            <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
              <span className="text-2xl font-black text-white/5">{index + 1}</span>
            </div>

            {/* Frame Index Label */}
            <div className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
              currentIndex === index ? 'bg-emerald-500 text-white' : 'bg-black/60 text-white/60'
            }`}>
              {index + 1}
            </div>

            {/* Action Buttons */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateFrame(index);
                }}
                className="p-1.5 bg-emerald-500/80 text-white rounded-md hover:bg-emerald-600"
                title="Duplicate Frame"
              >
                <Copy size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFrame(index);
                }}
                className="p-1.5 bg-red-500/80 text-white rounded-md hover:bg-red-600"
                title="Delete Frame"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </motion.div>
        ))}
        
        {/* Empty State / Add Frame Placeholder */}
        <button 
          onClick={onAddFrame}
          className="flex-shrink-0 w-32 aspect-video rounded-lg border-2 border-dashed border-white/10 hover:border-white/30 flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 transition-all"
        >
          <Plus size={24} />
          <span className="text-[10px] font-bold uppercase tracking-widest">New</span>
        </button>
      </div>
    </div>
  );
};
