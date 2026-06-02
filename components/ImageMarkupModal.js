import React, { useRef, useEffect, useState } from 'react';

export default function ImageMarkupModal({ isOpen, onClose, imageUrl, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    if (!isOpen || !imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    setCtx(context);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      // Calculate aspect ratio and fit into modal bounds (max 800x600)
      const maxW = window.innerWidth * 0.8;
      const maxH = window.innerHeight * 0.7;
      let w = img.width;
      let h = img.height;
      
      if (w > maxW) {
        h = h * (maxW / w);
        w = maxW;
      }
      if (h > maxH) {
        w = w * (maxH / h);
        h = maxH;
      }
      
      canvas.width = w;
      canvas.height = h;
      context.drawImage(img, 0, 0, w, h);
      
      // Setup default brush
      context.strokeStyle = '#ef4444'; // Red brush
      context.lineWidth = 4;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx) return;
    const { offsetX, offsetY } = getCoordinates(e);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const getCoordinates = (event) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    // Support for both mouse and touch events
    let clientX = event.clientX;
    let clientY = event.clientY;
    
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }
    
    return {
      offsetX: (clientX - rect.left) * scaleX,
      offsetY: (clientY - rect.top) * scaleY
    };
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    
    // Convert canvas to base64
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
    
    // Convert dataUrl to File object
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'markup-image.jpg', { type: 'image/jpeg' });
        onSave(file, dataUrl);
      })
      .catch(err => {
        console.error("Failed to convert canvas to file:", err);
        onClose();
      });
  };

  if (!isOpen) return null;

  return (
    <div className="markup-modal-overlay">
      <div className="markup-modal-content">
        <div className="markup-header">
          <h3>🖼️ 图片编辑与标记</h3>
          <p>按住鼠标或拖动手指在图片上进行红笔圈注</p>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="canvas-container">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
            onTouchMove={(e) => { e.preventDefault(); draw(e); }}
            onTouchEnd={stopDrawing}
          />
        </div>
        
        <div className="markup-footer">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-save" onClick={handleSave}>✅ 保存标记</button>
        </div>
      </div>
      
      <style jsx>{`
        .markup-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        .markup-modal-content {
          background: var(--color-bg-card, #0f172a);
          border: 1px solid rgba(45, 212, 191, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .markup-header {
          display: flex;
          flex-direction: column;
          margin-bottom: 1rem;
          position: relative;
        }
        .markup-header h3 {
          margin: 0 0 0.25rem 0;
          color: #f8fafc;
          font-size: 1.25rem;
        }
        .markup-header p {
          margin: 0;
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .close-btn {
          position: absolute;
          top: 0;
          right: 0;
          background: none;
          border: none;
          color: #94a3b8;
          font-size: 1.5rem;
          cursor: pointer;
        }
        .close-btn:hover {
          color: #ef4444;
        }
        .canvas-container {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          background: repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 20px 20px;
          border-radius: 8px;
          border: 1px solid #334155;
          margin-bottom: 1rem;
        }
        canvas {
          cursor: crosshair;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          touch-action: none;
        }
        .markup-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        .btn-cancel {
          padding: 0.75rem 1.5rem;
          background: transparent;
          border: 1px solid #475569;
          color: #cbd5e1;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }
        .btn-cancel:hover {
          background: rgba(255,255,255,0.05);
        }
        .btn-save {
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);
        }
        .btn-save:hover {
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
