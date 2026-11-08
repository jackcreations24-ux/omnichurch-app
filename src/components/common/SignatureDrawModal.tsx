import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Trash2,
  Check,
  Palette,
  PenTool,
  Sliders,
} from 'lucide-react';
import { Language } from '../../types';

interface SignatureDrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
  subtitle?: string;
  language?: Language;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export const SignatureDrawModal: React.FC<SignatureDrawModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  subtitle,
  language = 'ht',
}) => {
  const isEs = language === 'es';
  const isEn = language === 'en';
  const isFr = language === 'fr';

  const defaultTitle = isEs
    ? '✍️ Escribir Firma Electrónica Autorizada'
    : isEn
    ? '✍️ Draw Authorized Electronic Signature'
    : isFr
    ? '✍️ Tracer la Signature Électronique Autorisée'
    : '✍️ Ekri Siyati Elektwonik Otorize';

  const defaultSubtitle = isEs
    ? 'Dibuje su firma directamente con su dedo, lápiz óptico o ratón.'
    : isEn
    ? 'Draw your signature directly with your finger, stylus, or mouse.'
    : isFr
    ? 'Tracez votre signature directement avec votre doigt, stylet ou souris.'
    : 'Trase siyati ou dirèkteman avèk dwèt ou, yon plim stylus, oswa sourit la.';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('#0f172a');
  const [customColor, setCustomColor] = useState<string>('#1e40af');
  const [selectedWidth, setSelectedWidth] = useState<number>(3.8);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  const presetColors = [
    { name: isEs ? 'Negro Clásico' : isEn ? 'Classic Black' : isFr ? 'Noir Classique' : 'Nwa Klasik', value: '#0f172a' },
    { name: isEs ? 'Azul Marino' : isEn ? 'Navy Blue' : isFr ? 'Bleu Marine' : 'Ble Marin', value: '#1e3a8a' },
    { name: isEs ? 'Azul Real' : isEn ? 'Royal Blue' : isFr ? 'Bleu Royal' : 'Ble Wayal', value: '#2563eb' },
    { name: isEs ? 'Rojo Sagrado' : isEn ? 'Sacred Red' : isFr ? 'Rouge Sacré' : 'Wouj Sakre', value: '#991b1b' },
    { name: isEs ? 'Púrpura' : isEn ? 'Bishop Purple' : isFr ? 'Pourpre Évêque' : 'Vyolèt Evèk', value: '#581c87' },
    { name: isEs ? 'Verde Gracia' : isEn ? 'Grace Green' : isFr ? 'Vert Grâce' : 'Vèt Gras', value: '#166534' },
    { name: isEs ? 'Oro / Ámbar' : isEn ? 'Gold / Amber' : isFr ? 'Or / Ambre' : 'Lò / Amber', value: '#d97706' },
  ];

  const strokeWidths = [
    { label: isEs ? 'Fino' : isEn ? 'Fine' : isFr ? 'Fin' : 'Fen', value: 2.2 },
    { label: isEs ? 'Normal' : isEn ? 'Regular' : isFr ? 'Normal' : 'Nòmal', value: 3.8 },
    { label: isEs ? 'Grueso' : isEn ? 'Bold' : isFr ? 'Épais' : 'Epe', value: 5.8 },
  ];

  // Redraw canvas from strokes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background (transparent)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw baseline guide
    const guideY = canvas.height * 0.72;
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, guideY);
    ctx.lineTo(canvas.width - 30, guideY);
    ctx.stroke();

    // Small guide text
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#94a3b8';
    const guideLabel = isEs
      ? 'Línea de Firma Autorizada ✍️'
      : isEn
      ? 'Authorized Signature Line ✍️'
      : isFr
      ? 'Ligne de Signature Autorisée ✍️'
      : 'Liy Siyati Otorize ✍️';
    ctx.fillText(guideLabel, 36, guideY + 16);
    ctx.restore();

    // Render all confirmed strokes + current stroke
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    allStrokes.forEach((stroke) => {
      if (stroke.points.length < 1) return;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        const prev = stroke.points[stroke.points.length - 2] || stroke.points[0];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [strokes, currentStroke, isEs, isEn, isFr]);

  // Handle high-dpi sizing & re-draw
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    redrawCanvas();
  }, [isOpen, redrawCanvas]);

  // Pointer coordinate calculation
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const p = getCoordinates(e);
    if (!p) return;

    setIsDrawing(true);
    setHasDrawn(true);
    setCurrentStroke({
      points: [p],
      color: selectedColor,
      width: selectedWidth,
    });
  };

  const handleMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();
    const p = getCoordinates(e);
    if (!p) return;

    setCurrentStroke((prev) => (prev ? { ...prev, points: [...prev.points, p] } : null));
  };

  const handleEnd = (
    e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (e) e.preventDefault();
    if (isDrawing && currentStroke && currentStroke.points.length > 0) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    redrawCanvas();
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, prev.length - 1);
      if (next.length === 0) setHasDrawn(false);
      return next;
    });
  };

  // Convert transparent canvas into a clean cropped PNG data URL
  const getCroppedSignatureDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    const dpr = window.devicePixelRatio || 1;
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';

    ctx.scale(dpr, dpr);

    // Draw strokes only (NO background line or guide text)
    strokes.forEach((stroke) => {
      if (stroke.points.length < 1) return;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length - 1; i++) {
          const midX = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
          const midY = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, midX, midY);
        }
        const last = stroke.points[stroke.points.length - 1];
        const prev = stroke.points[stroke.points.length - 2] || stroke.points[0];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
        ctx.stroke();
      }
      ctx.restore();
    });

    // Find bounding box of pixels with alpha > 20
    const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const { data, width, height } = imgData;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let foundPixel = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alphaIndex = (y * width + x) * 4 + 3;
        if (data[alphaIndex] > 20) {
          foundPixel = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!foundPixel) {
      return offscreen.toDataURL('image/png');
    }

    // Add padding around crop
    const padding = 16 * dpr;
    const cropX = Math.max(0, minX - padding);
    const cropY = Math.max(0, minY - padding);
    const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2);
    const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2);

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return offscreen.toDataURL('image/png');

    croppedCtx.drawImage(
      offscreen,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return croppedCanvas.toDataURL('image/png');
  };

  const handleConfirm = () => {
    if (!hasDrawn || strokes.length === 0) return;
    const dataUrl = getCroppedSignatureDataUrl();
    onSave(dataUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{title || defaultTitle}</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  {isEs ? 'En Vivo' : isEn ? 'Live' : isFr ? 'En Direct' : 'Dirèk'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{subtitle || defaultSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label={isEs ? 'Cerrar' : isEn ? 'Close' : isFr ? 'Fermer' : 'Fèmen'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Controls */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Canvas Area */}
          <div className="relative w-full rounded-2xl border-2 border-dashed border-slate-650 bg-white shadow-inner overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
            <canvas
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              className="w-full h-[220px] cursor-crosshair touch-none select-none block"
              style={{ touchAction: 'none' }}
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 gap-1.5 opacity-60">
                <PenTool className="w-7 h-7 text-slate-400" />
                <span className="text-xs font-semibold">
                  {isEs
                    ? 'Firme aquí con su dedo o ratón...'
                    : isEn
                    ? 'Sign here using your finger or mouse...'
                    : isFr
                    ? 'Signez ici avec votre doigt ou la souris...'
                    : 'Siyen isit la avèk dwèt ou oswa sourit la...'}
                </span>
              </div>
            )}
          </div>

          {/* Color Presets & Custom Color Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {isEs
                    ? 'Elegir Color de Tinta:'
                    : isEn
                    ? 'Choose Ink Color:'
                    : isFr
                    ? 'Choisir la Couleur d’Encre :'
                    : 'Chwazi Koulè Lank la:'}
                </span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {(selectedColor || '').toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {presetColors.map((c) => {
                const isSelected = (selectedColor || '').toLowerCase() === (c.value || '').toLowerCase();
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 text-white ring-2 ring-amber-400/40 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-850'
                    }`}
                    title={c.name}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm shrink-0"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="hidden sm:inline">{c.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-amber-400 ml-0.5" />}
                  </button>
                );
              })}

              {/* Custom Color Input Picker */}
              <div className="flex items-center gap-1.5 pl-1">
                <label
                  htmlFor="custom-signature-color-picker"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-400/60 text-xs font-medium text-slate-200 cursor-pointer transition-colors shadow-sm"
                  title={isEs ? 'Color personalizado' : isEn ? 'Custom color' : isFr ? 'Couleur personnalisée' : 'Koulè pèsonalize'}
                >
                  <input
                    id="custom-signature-color-picker"
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      setSelectedColor(e.target.value);
                    }}
                    className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span>{isEs ? 'Personalizado' : isEn ? 'Custom' : isFr ? 'Personnalisé' : 'Pèsonalize'}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Stroke Width Selector & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEs ? 'Grosor:' : isEn ? 'Thickness:' : isFr ? 'Épaisseur :' : 'Epesè Plim:'}</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {strokeWidths.map((sw) => (
                  <button
                    key={sw.value}
                    type="button"
                    onClick={() => setSelectedWidth(sw.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedWidth === sw.value
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sw.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={strokes.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
                title={isEs ? 'Deshacer trazo' : isEn ? 'Undo last stroke' : isFr ? 'Annuler le trait' : 'Retounen dènye kou plim nan'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isEs ? 'Deshacer' : isEn ? 'Undo' : isFr ? 'Annuler' : 'Retounen'}</span>
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={!hasDrawn && strokes.length === 0}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 disabled:opacity-40 disabled:cursor-not-allowed text-red-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-red-800/40 transition-colors"
                title={isEs ? 'Borrar todo' : isEn ? 'Clear all' : isFr ? 'Tout effacer' : 'Efase tout'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEs ? 'Borrar Todo' : isEn ? 'Clear All' : isFr ? 'Tout Effacer' : 'Efase Tout'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            {isEs ? 'Cancelar' : isEn ? 'Cancel' : isFr ? 'Annuler' : 'Anile'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasDrawn || strokes.length === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>
              {isEs
                ? 'Aplicar y Guardar Firma'
                : isEn
                ? 'Apply & Save Signature'
                : isFr
                ? 'Appliquer & Enregistrer la Signature'
                : 'Aplike & Anrejistre Siyati Sa a'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
