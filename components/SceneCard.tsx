import React from 'react';
import { GeneratedScene } from '../types';
import { Download, Loader2, Check, Maximize2 } from 'lucide-react';

interface SceneCardProps {
  scene: GeneratedScene;
  onToggleSelect: (id: string) => void;
  onPreview: (url: string) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene, onToggleSelect, onPreview }) => {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!scene.imageUrl) return;
    const link = document.createElement('a');
    link.href = scene.imageUrl;
    link.download = `storyboard-${scene.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className={`relative group rounded-xl overflow-hidden border transition-all duration-200 ${
        scene.selected 
          ? 'border-blue-500 ring-2 ring-blue-500/20' 
          : 'border-gray-700 hover:border-gray-500'
      } bg-gray-800`}
    >
      {/* Selection Overlay Checkbox */}
      <div className="absolute top-3 left-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSelect(scene.id); }}
          className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
            scene.selected 
              ? 'bg-blue-500 border-blue-500 text-white' 
              : 'bg-black/40 border-white/50 text-transparent hover:border-white'
          }`}
        >
          <Check size={14} />
        </button>
      </div>

      {/* Image Area - Click to Preview */}
      <div 
        className="relative aspect-auto bg-gray-900 min-h-[200px] flex items-center justify-center cursor-pointer overflow-hidden"
        onClick={() => scene.imageUrl && onPreview(scene.imageUrl)}
      >
        {scene.isLoading ? (
          <div className="flex flex-col items-center text-gray-500 space-y-2">
            <Loader2 className="animate-spin" size={32} />
            <span className="text-sm">正在生成...</span>
          </div>
        ) : scene.error ? (
          <div className="p-4 text-center text-red-400 text-sm">
            生成失败: {scene.error}
          </div>
        ) : scene.imageUrl ? (
          <>
            <img 
              src={scene.imageUrl} 
              alt={scene.prompt} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Zoom Indicator */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
               <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg transform scale-90 group-hover:scale-100" size={32} />
            </div>
          </>
        ) : null}
        
        {/* Hover Actions - Download */}
        {!scene.isLoading && !scene.error && scene.imageUrl && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end pointer-events-none">
            <button 
              onClick={handleDownload}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-sm transition-colors pointer-events-auto"
              title="下载此图片"
            >
              <Download size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Prompt Text */}
      <div className="p-3 border-t border-gray-700 bg-gray-850" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-300 line-clamp-2" title={scene.prompt}>
          {scene.prompt}
        </p>
      </div>
    </div>
  );
};