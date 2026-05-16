import React, { useState, useCallback } from 'react';
import { ReferenceUploader } from './components/ReferenceUploader';
import { SceneCard } from './components/SceneCard';
import { generateSceneImage, analyzeScript } from './services/gemini';
import { AspectRatio, GeneratedScene, ReferenceImage, StoryStyle } from './types';
import { LayoutGrid, Download, Sparkles, AlertCircle, Trash2, RefreshCw, Palette, X } from 'lucide-react';

const App: React.FC = () => {
  const [promptText, setPromptText] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [style, setStyle] = useState<StoryStyle>('none');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [scenes, setScenes] = useState<GeneratedScene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      alert("请输入分镜脚本");
      return;
    }

    setIsGenerating(true);
    setStatusMessage("正在分析脚本...");

    try {
      // Step 1: Analyze script to get scenes
      const sceneDescriptions = await analyzeScript(promptText);
      
      if (sceneDescriptions.length === 0) {
        alert("未能识别出有效的分镜描述");
        setIsGenerating(false);
        return;
      }

      // Step 2: Create placeholders
      const newScenes: GeneratedScene[] = sceneDescriptions.map(desc => ({
        id: crypto.randomUUID(),
        prompt: desc,
        isLoading: true,
        selected: true
      }));

      // Prepend new scenes
      setScenes(prev => [...newScenes, ...prev]);
      setStatusMessage(`准备生成 ${newScenes.length} 个镜头...`);

      // Step 3: Generate images sequentially
      for (let i = 0; i < newScenes.length; i++) {
        const scene = newScenes[i];
        setStatusMessage(`正在生成第 ${i + 1}/${newScenes.length} 个镜头...`);
        
        try {
          const imageUrl = await generateSceneImage(scene.prompt, aspectRatio, referenceImages, style);
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, isLoading: false, imageUrl } : s
          ));
        } catch (err: any) {
          console.error(err);
          setScenes(prev => prev.map(s => 
            s.id === scene.id ? { ...s, isLoading: false, error: "生成失败，请重试" } : s
          ));
        }
      }

    } catch (error) {
      console.error(error);
      alert("处理请求时发生错误");
    } finally {
      setIsGenerating(false);
      setStatusMessage('');
    }
  };

  const handleRetry = async (id: string, prompt: string) => {
    setScenes(prev => prev.map(s => 
      s.id === id ? { ...s, isLoading: true, error: undefined } : s
    ));

    try {
      const imageUrl = await generateSceneImage(prompt, aspectRatio, referenceImages, style);
      setScenes(prev => prev.map(s => 
        s.id === id ? { ...s, isLoading: false, imageUrl } : s
      ));
    } catch (err) {
      setScenes(prev => prev.map(s => 
        s.id === id ? { ...s, isLoading: false, error: "重试失败" } : s
      ));
    }
  };

  const handleDelete = (id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id));
  };

  const toggleSelect = useCallback((id: string) => {
    setScenes(prev => prev.map(s => 
      s.id === id ? { ...s, selected: !s.selected } : s
    ));
  }, []);

  const selectAll = () => {
    const allSelected = scenes.every(s => s.selected);
    setScenes(prev => prev.map(s => ({ ...s, selected: !allSelected })));
  };

  const downloadSelected = async () => {
    const selectedScenes = scenes.filter(s => s.selected && s.imageUrl);
    if (selectedScenes.length === 0) return;

    for (let i = 0; i < selectedScenes.length; i++) {
        const scene = selectedScenes[i];
        if (scene.imageUrl) {
            const link = document.createElement('a');
            link.href = scene.imageUrl;
            link.download = `storyboard-${i + 1}-${scene.id.slice(0,4)}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await new Promise(r => setTimeout(r, 300));
        }
    }
  };

  const selectedCount = scenes.filter(s => s.selected && s.imageUrl).length;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row relative">
      
      {/* Lightbox Overlay */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
            onClick={() => setPreviewImage(null)}
          >
            <X size={32} />
          </button>
          
          <img 
            src={previewImage} 
            alt="Full Preview" 
            className="max-w-full max-h-full object-contain rounded-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Left Sidebar: Controls */}
      <div className="w-full md:w-[400px] flex-shrink-0 border-r border-gray-800 bg-gray-900 p-6 flex flex-col h-auto md:h-screen overflow-y-auto sticky top-0 z-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <LayoutGrid className="text-blue-400" />
            AI 分镜生成器
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            输入脚本，AI 自动拆解并生成分镜画面。
          </p>
        </div>

        <div className="space-y-8 flex-1">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              分镜脚本 / 故事描述
            </label>
            <textarea
              className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              placeholder="例如：&#10;清晨，阳光洒在咖啡店窗台上。（特写）&#10;一位年轻女子推门而入，风铃响起。（中景）&#10;咖啡师抬头微笑，手中正在擦拭杯子。"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
            <p className="text-xs text-gray-500">AI 将自动识别脚本中的场景备注并拆分为多个镜头。</p>
          </div>

          {/* Style Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Palette size={16} /> 画面风格
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setStyle('none')}
                className={`flex items-center px-4 py-3 rounded-lg border text-sm transition-all text-left ${
                  style === 'none' 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-100' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-400 mr-3"></span>
                现代写实风格
              </button>
              <button
                onClick={() => setStyle('ue5')}
                className={`flex items-center px-4 py-3 rounded-lg border text-sm transition-all text-left ${
                  style === 'ue5' 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400 mr-3"></span>
                UE5 游戏风格
              </button>
              <button
                onClick={() => setStyle('pixar')}
                className={`flex items-center px-4 py-3 rounded-lg border text-sm transition-all text-left ${
                  style === 'pixar' 
                    ? 'bg-purple-600/20 border-purple-500 text-purple-100' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 mr-3"></span>
                皮克斯 3D 动画风格
              </button>
              <button
                onClick={() => setStyle('ghibli')}
                className={`flex items-center px-4 py-3 rounded-lg border text-sm transition-all text-left ${
                  style === 'ghibli' 
                    ? 'bg-green-600/20 border-green-500 text-green-100' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 mr-3"></span>
                宫崎骏 手绘动画风格
              </button>
            </div>
          </div>

          {/* Reference Images */}
          <ReferenceUploader 
            images={referenceImages} 
            onImagesChange={setReferenceImages} 
          />

          {/* Aspect Ratio */}
          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-300">
              画面比例
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAspectRatio('1:1')}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  aspectRatio === '1:1' 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                1:1 (正方形)
              </button>
              <button
                onClick={() => setAspectRatio('3:4')}
                className={`p-3 rounded-lg border text-sm transition-all ${
                  aspectRatio === '3:4' 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                3:4 (竖构图)
              </button>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8 pt-6 border-t border-gray-800 sticky bottom-0 bg-gray-900 pb-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !promptText.trim()}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            {isGenerating ? (
              <>
                <Sparkles className="animate-spin" /> {statusMessage || '正在生成...'}
              </>
            ) : (
              <>
                <Sparkles /> 智能分析并生成
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Content: Gallery */}
      <div className="flex-1 p-6 md:p-8 h-full min-h-screen bg-gray-950 z-0">
        <div className="max-w-7xl mx-auto">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">
              生成结果 
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({scenes.length} 个镜头)
              </span>
            </h2>
            
            <div className="flex items-center gap-3">
              {scenes.length > 0 && (
                <button 
                  onClick={selectAll}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  全选 / 取消
                </button>
              )}
              <button
                onClick={downloadSelected}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg border border-gray-700 transition-colors"
              >
                <Download size={16} />
                批量下载 ({selectedCount})
              </button>
            </div>
          </div>

          {/* Grid */}
          {scenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600 border-2 border-dashed border-gray-800 rounded-3xl">
              <LayoutGrid size={64} className="mb-4 opacity-50" />
              <p className="text-lg">暂无内容</p>
              <p className="text-sm">在左侧输入故事脚本，AI 将自动分析镜头</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${aspectRatio === '1:1' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
              {scenes.map((scene) => (
                <div key={scene.id} className="relative group">
                  <SceneCard 
                    scene={scene} 
                    onToggleSelect={toggleSelect} 
                    onPreview={(url) => setPreviewImage(url)}
                  />
                  {/* Additional Actions outside the card if needed, or overlay */}
                   <div className="absolute top-3 right-3 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {scene.error && (
                         <button
                           onClick={(e) => { e.stopPropagation(); handleRetry(scene.id, scene.prompt); }}
                           className="p-1.5 bg-gray-800/80 hover:bg-blue-600 text-white rounded-full backdrop-blur-sm border border-gray-600"
                           title="重试"
                         >
                           <RefreshCw size={14} />
                         </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(scene.id); }}
                        className="p-1.5 bg-gray-800/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm border border-gray-600"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;