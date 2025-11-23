import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Undo, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  onComplete: (imageData: string) => void;
  color: string;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onComplete, color }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화 (투명 배경)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 현재 상태를 히스토리에 저장
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([...history, imageData]);

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lastState = history[history.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory(history.slice(0, -1));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const handleComplete = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스가 비어있는지 확인
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = !imageData.data.some(channel => channel !== 0);

    if (isEmpty) {
      alert('그림을 그려주세요!');
      return;
    }

    // 캔버스를 base64 이미지로 변환
    const base64Image = canvas.toDataURL('image/png');
    console.log('Generated image data:', base64Image.substring(0, 100) + '...'); // 디버깅용
    onComplete(base64Image);
  };

  return (
    <div className="space-y-3">
      {/* 캔버스 */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair w-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* 도구 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 브러시 크기 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">크기:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-xs text-gray-600 w-8">{brushSize}px</span>
        </div>

        {/* 지우개 */}
        <button
          onClick={() => setIsEraser(!isEraser)}
          className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
            isEraser
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Eraser size={16} />
          지우개
        </button>

        {/* 실행 취소 */}
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Undo size={16} />
          실행취소
        </button>

        {/* 전체 지우기 */}
        <button
          onClick={handleClear}
          className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          <Trash2 size={16} />
          전체지우기
        </button>
      </div>

      {/* 완료 버튼 */}
      <button
        onClick={handleComplete}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        그림 완성
      </button>
    </div>
  );
};

export default DrawingCanvas;
