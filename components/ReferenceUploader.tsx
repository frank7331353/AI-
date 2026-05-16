import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ReferenceImage } from '../types';

interface ReferenceUploaderProps {
  images: ReferenceImage[];
  onImagesChange: (images: ReferenceImage[]) => void;
}

export const ReferenceUploader: React.FC<ReferenceUploaderProps> = ({ images, onImagesChange }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const slotsRemaining = 3 - images.length;
    const filesToProcess = Array.from(files).slice(0, slotsRemaining);

    const processFile = (file: File): Promise<ReferenceImage> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            // Extract Base64 data (remove "data:image/xyz;base64," prefix)
            const base64Data = result.split(',')[1];
            resolve({
              id: crypto.randomUUID(),
              data: base64Data,
              mimeType: file.type
            });
          } else {
             reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    };

    try {
        const newImages = await Promise.all(filesToProcess.map(processFile));
        onImagesChange([...images, ...newImages]);
    } catch (e) {
        console.error("Error reading files:", e);
    }

    // Reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-300">
          参考图片 (最多3张) - 用于统一风格
        </label>
        <span className="text-xs text-gray-500">{images.length} / 3</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {images.map((img, index) => (
          <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
            <img 
              src={`data:${img.mimeType};base64,${img.data}`} 
              alt={`Ref ${index + 1}`} 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              #{index + 1}
            </div>
            <button
              onClick={() => removeImage(img.id)}
              className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {images.length < 3 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-700 hover:border-blue-500 hover:bg-gray-800/50 transition-colors cursor-pointer text-gray-500 hover:text-blue-400"
          >
            <Upload size={24} className="mb-2" />
            <span className="text-xs">上传图片</span>
          </button>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
};