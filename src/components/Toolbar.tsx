import React from 'react';
import { BrushSettings, LayerType, ToolType } from '../engine/types';
import { MousePointer2, Paintbrush, Eraser, Palette, Square, Circle, Minus, Type, Sliders, Ghost, Pipette } from 'lucide-react';

interface ToolbarProps {
  collapsed: boolean;
  settings: BrushSettings;
  onSettingsChange: (settings: BrushSettings) => void;
  activeLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
  onionSkinning: { enabled: boolean; opacity: number };
  onOnionSkinningChange: (val: { enabled: boolean; opacity: number }) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  collapsed,
  settings,
  onSettingsChange,
  activeLayer,
  onLayerChange,
  onionSkinning,
  onOnionSkinningChange
}) => {
  const colors = ['#000000', '#ffffff', '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
          <Paintbrush size={20} />
        </div>
        <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ backgroundColor: settings.color }} />
        <div className="h-px w-8 bg-white/10" />
        <Ghost size={20} className={onionSkinning.enabled ? 'text-emerald-500' : 'text-white/20'} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Tools Section */}
      <section>
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Tools</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: ToolType.Brush, icon: Paintbrush, label: 'Brush' },
            { id: ToolType.Eraser, icon: Eraser, label: 'Eraser' },
            { id: ToolType.Select, icon: MousePointer2, label: 'Select' },
            { id: ToolType.Fill, icon: Palette, label: 'Fill' },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => onSettingsChange({ ...settings, tool: tool.id })}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                settings.tool === tool.id 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                  : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
              }`}
            >
              <tool.icon size={20} />
              <span className="text-[10px] mt-1 font-medium">{tool.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Brush Settings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Brush</h3>
          <span className="text-xs text-white/60">{settings.size}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="100"
          value={settings.size}
          onChange={(e) => onSettingsChange({ ...settings, size: Number(e.target.value) })}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Colors</h3>
            <div className="relative group">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => onSettingsChange({ ...settings, color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="p-1.5 rounded-md bg-white/5 text-white/40 group-hover:text-white transition-colors">
                <Pipette size={14} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onSettingsChange({ ...settings, color: c })}
                className={`w-full aspect-square rounded-lg border-2 transition-all ${
                  settings.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Animation Settings */}
      <section>
        <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Animation</h3>
        <button
          onClick={() => onOnionSkinningChange({ ...onionSkinning, enabled: !onionSkinning.enabled })}
          className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${
            onionSkinning.enabled 
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
              : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'
          }`}
        >
          <Ghost size={18} />
          <span className="text-xs font-medium">Onion Skinning</span>
        </button>
        
        {onionSkinning.enabled && (
          <div className="mt-4 px-2">
            <div className="flex justify-between text-[10px] text-white/40 mb-2">
              <span>Opacity</span>
              <span>{Math.round(onionSkinning.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={onionSkinning.opacity}
              onChange={(e) => onOnionSkinningChange({ ...onionSkinning, opacity: Number(e.target.value) })}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        )}
      </section>
    </div>
  );
};
