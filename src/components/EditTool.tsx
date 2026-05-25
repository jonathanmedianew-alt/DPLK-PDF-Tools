import React, { useState, useRef, useEffect } from 'react';
import { Annotation, TextAnnotation, ShapeAnnotation, DrawingAnnotation, ImageAnnotation, SignatureAnnotation, HighlightAnnotation, FormFieldAnnotation } from '../types';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { 
  Edit3, Type, Square, Circle, Image as ImageIcon, 
  Trash2, Download, RefreshCw, ZoomIn, ZoomOut, 
  CheckCircle, Plus, Eye, Palette, MousePointer,
  RotateCw, Sparkles, Underline as UnderlineIcon,
  Strikethrough as StrikethroughIcon, SquareDot, Check,
  X, PenTool, Layers, Compass, Loader2
} from 'lucide-react';

// Configure the worker for PDFJS
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs';

interface EditToolProps {
  onBack: () => void;
}

export default function EditTool({ onBack }: EditToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);
  const [pdfJsDoc, setPdfJsDoc] = useState<pdfjs.PDFDocumentProxy | null>(null);
  const [editingAnnoId, setEditingAnnoId] = useState<string | null>(null);
  
  // Sidebar Tabs
  const [activeTab, setActiveTab] = useState<'tools' | 'elements' | 'scan'>('tools');

  // Editor States
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'form-field' | 'shape' | 'drawing' | 'image' | 'highlight' | 'signature'>('select');
  const [activeColor, setActiveColor] = useState('#EF4444'); // default red
  const [fontSize, setFontSize] = useState<number>(16);
  const [shapeType, setShapeType] = useState<'rectangle' | 'circle'>('rectangle');
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'Courier' | 'Times-Roman'>('Helvetica');
  const [textInput, setTextInput] = useState('New text');
  const [opacity, setOpacity] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [underline, setUnderline] = useState<boolean>(false);
  const [strikethrough, setStrikethrough] = useState<boolean>(false);

  // Freehand drawing stroke size
  const [lineWidth, setLineWidth] = useState<number>(4);

  // Scanning state
  const [isScanningText, setIsScanningText] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // Active annotations list
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnoId, setSelectedAnnoId] = useState<string | null>(null);
  
  // Draggable / Resizable states
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    startAnnoX: number;
    startAnnoY: number;
    startWidth?: number;
    startHeight?: number;
    isResizing?: boolean;
    handleType?: 'nw' | 'ne' | 'se' | 'sw';
  } | null>(null);

  // Drawings helpers
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeDrawingPoints, setActiveDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [drawingPageIdx, setDrawingPageIdx] = useState<number | null>(null);

  // Signature Pad State
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSigDrawing, setIsSigDrawing] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [editedBlobUrl, setEditedBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // PDF.js render trigger refs
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const pageContainerRefs = useRef<HTMLDivElement[]>([]);

  // Keyboard listener for deleting selected annotation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedAnnoId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          // Verify we aren't inputting text in some active field
          if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
            e.preventDefault();
            deleteAnnotation(selectedAnnoId);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAnnoId]);

  // Sync states when an annotation is selected
  useEffect(() => {
    if (selectedAnnoId) {
      setActiveTab('elements'); // Automatically switch to elements tab for editing properties!
      const selected = annotations.find(a => a.id === selectedAnnoId);
      if (selected) {
        if (selected.type === 'text') {
          setTextInput(selected.text);
          setFontSize(selected.fontSize);
          setActiveColor(selected.color);
          setFontFamily(selected.fontFamily);
          setUnderline(selected.underline || false);
          setStrikethrough(selected.strikethrough || false);
          setOpacity(selected.opacity ?? 1.0);
          setRotation(selected.rotation || 0);
        } else if (selected.type === 'shape') {
          setActiveColor(selected.color);
          setOpacity(selected.opacity ?? 1.0);
          setRotation(selected.rotation || 0);
          setShapeType(selected.shapeType);
        } else if (selected.type === 'form-field') {
          setTextInput(selected.fieldValue);
          setFontSize(selected.fontSize);
          setOpacity(selected.opacity ?? 1.0);
          setRotation(selected.rotation || 0);
        } else if (selected.type === 'highlight') {
          setActiveColor(selected.color);
          setOpacity(selected.opacity ?? 0.4);
        } else if (selected.type === 'signature' || selected.type === 'image') {
          setOpacity(selected.opacity ?? 1.0);
          setRotation(selected.rotation || 0);
        }
      }
    }
  }, [selectedAnnoId, annotations]);

  // Page upload trigger
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setError(null);
    setEditedBlobUrl(null);
    setAnnotations([]);
    setSelectedAnnoId(null);
    setScanSuccessMessage(null);
    
    const selectedFile = e.target.files[0];
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    
    setFile(selectedFile);
    await loadPdfDetails(selectedFile);
  };

  const loadPdfDetails = async (pdfFile: File) => {
    try {
      const buffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const count = pdfDoc.getPageCount();
      setTotalPages(count);
      
      const dims = [];
      for (let i = 0; i < count; i++) {
        const page = pdfDoc.getPage(i);
        dims.push({
          width: page.getWidth(),
          height: page.getHeight()
        });
      }
      setPageDimensions(dims);
      
      // Load with PDFJS and save pdfJsDoc instance
      const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer.slice(0)) });
      const pdf = await loadingTask.promise;
      setPdfJsDoc(pdf);

      // AUTOMATIC TEXT character extraction so existing text is immediately editable!
      await scanAndExtractTextAutomatically(pdf);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to read PDF pages: ${err?.message || 'Error occurred'}`);
    }
  };

  const scanAndExtractTextAutomatically = async (pdf: pdfjs.PDFDocumentProxy) => {
    try {
      const extractedAnnos: Annotation[] = [];
      let totalExtractedItems = 0;

      for (let pIndex = 0; pIndex < pdf.numPages; pIndex++) {
        const page = await pdf.getPage(pIndex + 1);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1 });
        
        const items = textContent.items as any[];
        items.forEach((item, idx) => {
          if (!item.str || item.str.trim().length === 0) return;

          // item.transform: [fontHeight, 0, 0, fontHeight, translateX, translateY]
          const tx = item.transform[4];
          const ty = item.transform[5];
          const fSize = item.transform[0] || 12;

          // Convert PDF coordinate bounds (X positive right, Y positive up) to workspace percentages
          const xPercent = (tx / viewport.width) * 100;
          const yPercent = ((viewport.height - ty) / viewport.height) * 100;

          // Dimensions
          const widthPercent = item.width ? (item.width / viewport.width) * 100 : (item.str.length * fSize * 0.5 / viewport.width) * 100;
          const heightPercent = item.height ? (item.height / viewport.height) * 100 : (fSize / viewport.height) * 100;

          if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
            extractedAnnos.push({
              id: `existing-text-${pIndex}-${idx}-${Date.now()}`,
              pageIndex: pIndex,
              type: 'text',
              x: Math.max(0, Math.min(95, xPercent)),
              y: Math.max(0, Math.min(98, yPercent)),
              text: item.str,
              fontSize: Math.max(8, Math.min(24, Math.round(fSize))),
              color: '#111827', // dark charcoal
              fontFamily: 'Helvetica',
              opacity: 1.0,
              rotation: 0,
              underline: false,
              strikethrough: false,
              isExisting: true,
              isDeleted: false,
              originalText: item.str,
              originalX: Math.max(0, Math.min(95, xPercent)),
              originalY: Math.max(0, Math.min(98, yPercent)),
              originalWidth: widthPercent,
              originalHeight: heightPercent
            } as TextAnnotation);
            totalExtractedItems++;
          }
        });
      }

      if (extractedAnnos.length > 0) {
        setAnnotations((prev) => [
          ...prev.filter((a) => !(a as any).isExisting),
          ...extractedAnnos
        ]);
        setScanSuccessMessage(`Successfully digitized ${totalExtractedItems} editable text sections from your PDF! Double-click on any word layer on-screen to instantly rewrite, re-color, rotate, or delete existing texts.`);
      }
    } catch (err) {
      console.warn("Failed background auto character extraction:", err);
    }
  };

  // ADVANCED FEATURE: Scan existing texts in PDF and insert them as editable text layers!
  const scanExistingPdfText = async () => {
    if (!file || !pdfJsDoc) return;
    setIsScanningText(true);
    setError(null);
    setScanSuccessMessage(null);

    try {
      // Clear previous existing annotations to prevent duplication
      setAnnotations((prev) => prev.filter((a) => !(a as any).isExisting));

      await scanAndExtractTextAutomatically(pdfJsDoc);
      setActiveTab('elements');
      setSelectedTool('select');
    } catch (err: any) {
      console.error(err);
      setError(`Unable to parse the PDF structure: ${err?.message || err}`);
    } finally {
      setIsScanningText(false);
    }
  };

  const handlePageClick = (pageIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (selectedTool === 'select' || selectedTool === 'drawing') return;
    
    const container = pageContainerRefs.current[pageIdx];
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;

    let newAnno: Annotation | null = null;

    if (selectedTool === 'text') {
      newAnno = {
        id: `text-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'text',
        x: xPercent,
        y: yPercent,
        text: textInput || 'Click to change text',
        fontSize: fontSize,
        color: activeColor,
        fontFamily: fontFamily,
        opacity: opacity,
        rotation: rotation,
        underline: underline,
        strikethrough: strikethrough
      } as TextAnnotation;
    } else if (selectedTool === 'form-field') {
      newAnno = {
        id: `form-field-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'form-field',
        x: xPercent,
        y: yPercent,
        fieldName: `Input ${annotations.length + 1}`,
        fieldValue: '',
        width: 25, // default width
        height: 5,  // default height
        fontSize: 14,
        placeholder: 'Insert answer here...',
        opacity: 1.0,
        rotation: 0
      } as FormFieldAnnotation;
    } else if (selectedTool === 'shape') {
      newAnno = {
        id: `shape-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'shape',
        shapeType: shapeType,
        x: Math.max(2, xPercent - 10),
        y: Math.max(2, yPercent - 7),
        width: 18,
        height: 12,
        color: activeColor,
        borderColor: '#111827',
        borderWidth: 2,
        opacity: opacity,
        rotation: rotation
      } as ShapeAnnotation;
    } else if (selectedTool === 'highlight') {
      newAnno = {
        id: `highlight-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'highlight',
        x: Math.max(1, xPercent - 8),
        y: Math.max(0.5, yPercent - 2),
        width: 16,
        height: 4,
        color: activeColor === '#EF4444' || activeColor === '#111827' ? '#F59E0B' : activeColor, // default to yellow highlighter if color is dark
        opacity: 0.4
      } as HighlightAnnotation;
    }

    if (newAnno) {
      setAnnotations((prev) => [...prev, newAnno!]);
      setSelectedAnnoId(newAnno.id);
      setSelectedTool('select'); // fallback to inspect or move
      setActiveTab('elements');
    }
    
    if (editedBlobUrl) setEditedBlobUrl(null);
  };

  // Image upload handler
  const handleUploadImageAnnotation = (pageIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const imgFile = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      const newAnno: ImageAnnotation = {
        id: `image-${Date.now()}`,
        pageIndex: pageIdx,
        type: 'image',
        imageUrl: b64,
        x: 35,
        y: 40,
        width: 30, // 30% of page
        height: 20, // 20% of page
        opacity: opacity,
        rotation: rotation
      };
      setAnnotations((prev) => [...prev, newAnno]);
      setSelectedAnnoId(newAnno.id);
      setSelectedTool('select');
      setActiveTab('elements');
    };
    reader.readAsDataURL(imgFile);
    if (editedBlobUrl) setEditedBlobUrl(null);
  };

  // Draggable / Resizable Actions
  const handleMouseDown = (pageIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    // Drawing tool takes precedence
    if (selectedTool === 'drawing') {
      setIsDrawing(true);
      setDrawingPageIdx(pageIdx);
      
      const container = pageContainerRefs.current[pageIdx];
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setActiveDrawingPoints([{ x, y }]);
      return;
    }
  };

  const handleMouseMove = (pageIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawing && selectedTool === 'drawing' && drawingPageIdx === pageIdx) {
      const container = pageContainerRefs.current[pageIdx];
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      setActiveDrawingPoints((prev) => [...prev, { x, y }]);
      return;
    }

    // Handle Active Drag/Resize of Elements
    if (dragState) {
      e.preventDefault();
      const anno = annotations.find(a => a.id === dragState.id);
      if (!anno) return;

      const container = pageContainerRefs.current[anno.pageIndex];
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const deltaXPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragState.startY) / rect.height) * 100;

      if (dragState.isResizing) {
        // Handle resizing based on handle type and coordinate changes
        const widthChange = deltaXPercent;
        const heightChange = deltaYPercent;

        setAnnotations((prev) => prev.map((a) => {
          if (a.id !== dragState.id) return a;
          const originalW = dragState.startWidth || 15;
          const originalH = dragState.startHeight || 10;
          
          let updatedW = originalW;
          let updatedH = originalH;
          let updatedX = a.x;
          let updatedY = a.y;

          if (dragState.handleType === 'se') {
            updatedW = Math.max(2, originalW + widthChange);
            updatedH = Math.max(2, originalH + heightChange);
          } else if (dragState.handleType === 'sw') {
            const possibleW = originalW - widthChange;
            if (possibleW > 2) {
              updatedW = possibleW;
              updatedX = dragState.startAnnoX + widthChange;
            }
            updatedH = Math.max(2, originalH + heightChange);
          } else if (dragState.handleType === 'ne') {
            updatedW = Math.max(2, originalW + widthChange);
            const possibleH = originalH - heightChange;
            if (possibleH > 2) {
              updatedH = possibleH;
              updatedY = dragState.startAnnoY + heightChange;
            }
          } else if (dragState.handleType === 'nw') {
            const possibleW = originalW - widthChange;
            if (possibleW > 2) {
              updatedW = possibleW;
              updatedX = dragState.startAnnoX + widthChange;
            }
            const possibleH = originalH - heightChange;
            if (possibleH > 2) {
              updatedH = possibleH;
              updatedY = dragState.startAnnoY + heightChange;
            }
          }

          // Return merged changes depending on annotation type
          if (a.type === 'shape') {
            return { ...a, width: updatedW, height: updatedH, x: updatedX, y: updatedY } as ShapeAnnotation;
          } else if (a.type === 'image') {
            return { ...a, width: updatedW, height: updatedH, x: updatedX, y: updatedY } as ImageAnnotation;
          } else if (a.type === 'signature') {
            return { ...a, width: updatedW, height: updatedH, x: updatedX, y: updatedY } as SignatureAnnotation;
          } else if (a.type === 'highlight') {
            return { ...a, width: updatedW, height: updatedH, x: updatedX, y: updatedY } as HighlightAnnotation;
          } else if (a.type === 'form-field') {
            return { ...a, width: updatedW, height: updatedH, x: updatedX, y: updatedY } as FormFieldAnnotation;
          }
          return a;
        }));
      } else {
        // Standard dragging
        setAnnotations((prev) => prev.map((a) => {
          if (a.id !== dragState.id) return a;
          const nextX = Math.max(0, Math.min(100, dragState.startAnnoX + deltaXPercent));
          const nextY = Math.max(0, Math.min(100, dragState.startAnnoY + deltaYPercent));
          return { ...a, x: nextX, y: nextY };
        }));
      }
      if (editedBlobUrl) setEditedBlobUrl(null);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && drawingPageIdx !== null && activeDrawingPoints.length > 1) {
      const newAnno: DrawingAnnotation = {
        id: `draw-${Date.now()}`,
        pageIndex: drawingPageIdx,
        type: 'drawing',
        x: activeDrawingPoints[0].x,
        y: activeDrawingPoints[0].y,
        points: activeDrawingPoints,
        color: activeColor,
        lineWidth: lineWidth,
        opacity: opacity
      };
      
      setAnnotations((prev) => [...prev, newAnno]);
      setActiveDrawingPoints([]);
      setDrawingPageIdx(null);
      if (editedBlobUrl) setEditedBlobUrl(null);
    }
    
    setIsDrawing(false);
    setDragState(null);
  };

  const deleteAnnotation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAnnotations((prev) => prev.map((a) => {
      if (a.id === id) {
        if ((a as any).isExisting) {
          return { ...a, isDeleted: true };
        }
        return null; // filters out new custom-added annotations immediately
      }
      return a;
    }).filter(Boolean) as Annotation[]);
    if (selectedAnnoId === id) setSelectedAnnoId(null);
    if (editedBlobUrl) setEditedBlobUrl(null);
  };

  // Updaters for the selected element
  const updateSelectedProperty = (property: string, value: any) => {
    if (!selectedAnnoId) return;
    setAnnotations((prev) => prev.map((a) => {
      if (a.id !== selectedAnnoId) return a;
      return { ...a, [property]: value };
    }));
    if (editedBlobUrl) setEditedBlobUrl(null);
  };

  // Signature Modal Canvas actions
  const startSigDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsSigDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = activeColor || '#111827';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const saveSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    
    // Check if empty canvas
    const imgData = canvas.toDataURL('image/png');
    
    // Add signature in the dead-center of page 0
    const newAnno: SignatureAnnotation = {
      id: `sig-${Date.now()}`,
      pageIndex: 0,
      type: 'signature',
      signatureUrl: imgData,
      color: activeColor,
      x: 35,
      y: 45,
      width: 25,
      height: 10,
      opacity: 1.0,
      rotation: 0
    };

    setAnnotations((prev) => [...prev, newAnno]);
    setSelectedAnnoId(newAnno.id);
    setSelectedTool('select');
    setShowSignatureModal(false);
    setActiveTab('elements');
    if (editedBlobUrl) setEditedBlobUrl(null);
  };

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Helper converts hex color to pdf-lib rgb structure
  const hexToPdfRgb = (hex: string) => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    } : { r: 1, g: 0, b: 0 };
  };

  // Native compiled saving mechanism with layout coordinates matching PDF resolution perfectly
  const handleSaveCompiledPDF = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    
    try {
      const originalBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      
      const fontHelv = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontCour = await pdfDoc.embedFont(StandardFonts.Courier);
      const fontTimes = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      
      const getFont = (family: string) => {
        if (family === 'Courier') return fontCour;
        if (family === 'Times-Roman') return fontTimes;
        return fontHelv;
      };

      // Sort and apply page annotations safely
      for (const anno of annotations) {
        if (anno.pageIndex >= pdfDoc.getPageCount()) continue;
        
        const page = pdfDoc.getPage(anno.pageIndex);
        const W = page.getWidth();
        const H = page.getHeight();
        
        const absoluteX = (anno.x / 100) * W;
        // Invert Y axis relative to bottom-up PDF environment layout grid
        const absoluteY = H - ((anno.y / 100) * H);
        
        const colAndRgb = hexToPdfRgb(anno.color || '#111827');
        const drawColor = rgb(colAndRgb.r, colAndRgb.g, colAndRgb.b);
        const currentOpacity = anno.opacity ?? 1.0;
        const currentRotation = anno.rotation || 0;

        // Check if existing text was deleted or modified
        if (anno.type === 'text' && (anno as any).isExisting) {
          const textAnno = anno as TextAnnotation;
          const wasModified = textAnno.text !== textAnno.originalText || textAnno.x !== textAnno.originalX || textAnno.y !== textAnno.originalY;
          const wasDeleted = textAnno.isDeleted;

          if (wasDeleted || wasModified) {
            // Whiteout original text
            const origXAbs = (textAnno.originalX! / 100) * W;
            const origYAbs = H - ((textAnno.originalY! / 100) * H);
            const origWAbs = (textAnno.originalWidth! / 100) * W;
            const origHAbs = (textAnno.originalHeight! / 100) * H;

            page.drawRectangle({
              x: origXAbs - 2,
              y: origYAbs - origHAbs * 0.15, 
              width: origWAbs + 4,
              height: origHAbs * 1.35,
              color: rgb(1, 1, 1), // solid white
              opacity: 1.0
            });
          }

          if (wasDeleted) {
            // Do not render anything more for deleted text!
            continue;
          }
          
          if (!wasModified) {
            // Unchanged existing text: let PDF native rendering keep it, don't draw duplicate!
            continue;
          }
        }

        if (anno.type === 'text') {
          const isExistingText = (anno as any).isExisting;
          // For scanned native text, absoluteY is the exact baseline coordinate.
          // For new manual text additions, we offset slightly to align seamlessly in the PDF byte structure
          const drawY = isExistingText ? absoluteY : absoluteY - anno.fontSize * 0.15;

          // Draw standard or edited text content with support for rotations and opacities
          page.drawText(anno.text, {
            x: absoluteX,
            y: drawY,
            size: anno.fontSize,
            font: getFont(anno.fontFamily),
            color: drawColor,
            opacity: currentOpacity,
            rotate: degrees(currentRotation)
          });

          // Text decorations: Underline & Strikethrough calculations
          const calculatedTextWidth = anno.text.length * anno.fontSize * 0.48; // heuristic proportional mapping
          
          if (anno.underline) {
            page.drawLine({
              start: { x: absoluteX, y: absoluteY - anno.fontSize * 0.9 },
              end: { x: absoluteX + calculatedTextWidth, y: absoluteY - anno.fontSize * 0.9 },
              color: drawColor,
              thickness: Math.max(1, anno.fontSize / 15),
              opacity: currentOpacity
            });
          }

          if (anno.strikethrough) {
            page.drawLine({
              start: { x: absoluteX, y: absoluteY - anno.fontSize * 0.4 },
              end: { x: absoluteX + calculatedTextWidth, y: absoluteY - anno.fontSize * 0.4 },
              color: drawColor,
              thickness: Math.max(1, anno.fontSize / 15),
              opacity: currentOpacity
            });
          }

        } else if (anno.type === 'form-field') {
          // Flatten dynamic user interactions/answers into standard outputs
          const displayString = anno.fieldValue || anno.placeholder || '';
          page.drawText(displayString, {
            x: absoluteX + 6,
            y: absoluteY - anno.fontSize * 1.0,
            size: anno.fontSize,
            font: getFont('Helvetica'),
            color: rgb(0.1, 0.1, 0.1),
            opacity: currentOpacity,
            rotate: degrees(currentRotation)
          });
          
          // Draw light background bounds indicator
          const absW = (anno.width / 100) * W;
          const absH = (anno.height / 100) * H;
          page.drawRectangle({
            x: absoluteX,
            y: absoluteY - absH,
            width: absW,
            height: absH,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 1,
            color: rgb(1, 1, 1),
            opacity: 0.1,
            rotate: degrees(currentRotation)
          });

        } else if (anno.type === 'shape') {
          const absW = (anno.width / 100) * W;
          const absH = (anno.height / 100) * H;
          
          if (anno.shapeType === 'rectangle') {
            page.drawRectangle({
              x: absoluteX,
              y: absoluteY - absH,
              width: absW,
              height: absH,
              color: drawColor,
              opacity: currentOpacity,
              borderColor: rgb(0.1, 0.1, 0.1),
              borderWidth: anno.borderWidth,
              rotate: degrees(currentRotation)
            });
          } else {
            // Circle
            page.drawCircle({
              x: absoluteX + absW / 2,
              y: absoluteY - absH / 2,
              size: Math.min(absW, absH) / 2,
              color: drawColor,
              opacity: currentOpacity,
              borderColor: rgb(0.1, 0.1, 0.1),
              borderWidth: anno.borderWidth
            });
          }

        } else if (anno.type === 'highlight') {
          // Highlight layout bands (such as transparent bright translucent layers)
          const absW = (anno.width / 100) * W;
          const absH = (anno.height / 100) * H;
          page.drawRectangle({
            x: absoluteX,
            y: absoluteY - absH,
            width: absW,
            height: absH,
            color: drawColor,
            opacity: currentOpacity // default is 0.4
          });

        } else if (anno.type === 'drawing') {
          // Freehand Line Drawings
          const points = anno.points;
          for (let i = 0; i < points.length - 1; i++) {
            const startPt = points[i];
            const endPt = points[i + 1];
            
            page.drawLine({
              start: { x: (startPt.x / 100) * W, y: H - ((startPt.y / 100) * H) },
              end: { x: (endPt.x / 100) * W, y: H - ((endPt.y / 100) * H) },
              color: drawColor,
              thickness: anno.lineWidth,
              opacity: currentOpacity
            });
          }

        } else if (anno.type === 'image') {
          // Custom base64 image layer inserts
          try {
            const imageBytes = await fetch(anno.imageUrl).then(res => res.arrayBuffer());
            let pdfImg;
            if (anno.imageUrl.includes('image/png')) {
              pdfImg = await pdfDoc.embedPng(imageBytes);
            } else {
              pdfImg = await pdfDoc.embedJpg(imageBytes);
            }
            
            const absW = (anno.width / 100) * W;
            const absH = (anno.height / 100) * H;

            page.drawImage(pdfImg, {
              x: absoluteX,
              y: absoluteY - absH,
              width: absW,
              height: absH,
              opacity: currentOpacity,
              rotate: degrees(currentRotation)
            });
          } catch (imgErr) {
            console.error('Error embedding image annotation into PDF:', imgErr);
          }

        } else if (anno.type === 'signature') {
          // Real drawn signatures
          try {
            const imageBytes = await fetch(anno.signatureUrl).then(res => res.arrayBuffer());
            const pdfSigImg = await pdfDoc.embedPng(imageBytes);
            
            const absW = (anno.width / 100) * W;
            const absH = (anno.height / 100) * H;

            page.drawImage(pdfSigImg, {
              x: absoluteX,
              y: absoluteY - absH,
              width: absW,
              height: absH,
              opacity: currentOpacity,
              rotate: degrees(currentRotation)
            });
          } catch (sigErr) {
            console.error('Error embedding signature into PDF:', sigErr);
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      setEditedBlobUrl(URL.createObjectURL(pdfBlob));
      
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.5 }
      });
    } catch (err: any) {
      console.error(err);
      setError(`Failed to compile modified elements: ${err?.message || 'Calculation error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPresetColors = () => [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#8B5CF6', '#EC4899', '#111827', '#FBBF24'
  ];

  const selectedAnno = annotations.find(a => a.id === selectedAnnoId);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8" id="edit-tool-main-container">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <button 
            type="button" 
            onClick={onBack}
            className="text-sm font-semibold text-gray-500 hover:text-rose-600 transition flex items-center gap-2 mb-2"
          >
            ← Leave Editor
          </button>
          <h1 className="text-3xl font-sans font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <span className="p-2 bg-rose-50 rounded-xl text-rose-600"><Edit3 className="h-7 w-7" /></span>
            Advanced PDF Editor
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Modify any text context, sign, draw freehand patterns, fill forms, adjust transparency/angles, and resize items.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded text-rose-800"><X className="h-4 w-4" /></button>
        </div>
      )}

      {scanSuccessMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Text Extraction Scanning Completed!</p>
            <p className="text-xs mt-1 text-emerald-700">{scanSuccessMessage}</p>
          </div>
          <button type="button" onClick={() => setScanSuccessMessage(null)} className="p-1 hover:bg-emerald-100 rounded text-emerald-800"><X className="h-4 w-4 text-emerald-800" /></button>
        </div>
      )}

      {!file ? (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 hover:bg-gray-100/50 hover:border-rose-400 transition-all p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6 text-rose-600 shadow-md">
            <Edit3 className="h-10 w-10 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upload or drop a PDF to edit</h3>
          <p className="text-gray-500 text-sm max-w-md mb-8">
            Loads directly in your local safe memory. Supports form filling, dynamic signatures, image insertion, text highlight underlines, rotation overlays, and object resizing on real documents.
          </p>
          
          <label className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold py-3.5 px-8 rounded-xl shadow-md transition inline-flex items-center gap-2.5">
            <Plus className="h-4 w-4 stroke-[3]" />
            Select PDF Document
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          {/* LATEST REDESIGNED SIDEBAR PANEL */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden sticky top-4">
            
            {/* Sidebar Tabs Selector */}
            <div className="flex border-b border-gray-100 bg-gray-50/80">
              <button
                type="button"
                onClick={() => setActiveTab('tools')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === 'tools' 
                    ? 'border-rose-600 text-rose-600 bg-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                1. Choose Tool
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('elements')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === 'elements' 
                    ? 'border-rose-600 text-rose-600 bg-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                2. Customize ({annotations.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === 'scan' 
                    ? 'border-rose-600 text-rose-600 bg-white' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                📝 Scan Text
              </button>
            </div>

            <div className="p-5 space-y-6">

              {/* TAB 1: TOOLS SELECTOR */}
              {activeTab === 'tools' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Annotation Brush Types</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTool('select')}
                        className={`p-3 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition ${
                          selectedTool === 'select'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        title="Click to select, drag, rotate or scale objects"
                      >
                        <MousePointer className="h-4 w-4 text-rose-500" />
                        Select & Move
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTool('text')}
                        className={`p-3 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition ${
                          selectedTool === 'text'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Type className="h-4 w-4 text-pink-500" />
                        Add Text
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTool('form-field')}
                        className={`p-3 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition ${
                          selectedTool === 'form-field'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        title="Add fillable inputs to mock form sections"
                      >
                        <SquareDot className="h-4 w-4 text-amber-500" />
                        Fill Forms
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTool('shape')}
                        className={`p-3 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition ${
                          selectedTool === 'shape'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Square className="h-4 w-4 text-blue-500" />
                        Add Shape
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTool('drawing')}
                        className={`p-3 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition ${
                          selectedTool === 'drawing'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        title="Draw signatures or freestyle arrows/markings"
                      >
                        <Edit3 className="h-4 w-4 text-emerald-500" />
                        Draw Freehand
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTool('highlight')}
                        className={`p-3 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1.5 transition ${
                          selectedTool === 'highlight'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        title="Highlight key sentences with transclucent covers"
                      >
                        <Palette className="h-4 w-4 text-yellow-500" />
                        Highlight Text
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(true)}
                        className="p-3 rounded-xl border border-gray-200 bg-white text-gray-600 text-[11px] font-bold flex flex-col items-center gap-1.5 transition hover:bg-gray-50 hover:border-gray-300"
                        title="Open interactive drawing touchboard"
                      >
                        <PenTool className="h-4 w-4 text-indigo-500" />
                        Sign document
                      </button>
                    </div>
                  </div>

                  {/* General Preset Selection values depending on tool */}
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Tool Settings</h4>
                    
                    {/* Color Swatch */}
                    <div>
                      <span className="block text-[10px] font-bold text-gray-500 mb-2">PICK COLOR PRESET</span>
                      <div className="flex flex-wrap gap-1.5">
                        {getPresetColors().map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setActiveColor(c);
                              if (selectedAnnoId) updateSelectedProperty('color', c);
                            }}
                            style={{ backgroundColor: c }}
                            className={`h-5 w-5 rounded-full border transition transform hover:scale-110 ${
                              activeColor === c ? 'ring-2 ring-rose-500 border-white' : 'border-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Tool details conditional rendering */}
                    {selectedTool === 'text' && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">DEFAULT TEXT OVERLAY</label>
                          <input
                            type="text"
                            value={textInput}
                            onChange={(e) => {
                              setTextInput(e.target.value);
                              if (selectedAnnoId) updateSelectedProperty('text', e.target.value);
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium focus:ring-1 focus:ring-rose-400 focus:outline-none"
                            placeholder="Type new line..."
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">FONT SIZE</span>
                            <select
                              value={fontSize}
                              onChange={(e) => {
                                setFontSize(Number(e.target.value));
                                if (selectedAnnoId) updateSelectedProperty('fontSize', Number(e.target.value));
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs text-gray-800"
                            >
                              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map((sz) => (
                                <option key={sz} value={sz}>{sz}px</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="block text-[10px] font-bold text-gray-500 mb-1">FONT FAMILY</span>
                            <select
                              value={fontFamily}
                              onChange={(e) => {
                                setFontFamily(e.target.value as any);
                                if (selectedAnnoId) updateSelectedProperty('fontFamily', e.target.value);
                              }}
                              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs text-gray-800"
                            >
                              <option value="Helvetica">Helvetica</option>
                              <option value="Courier">Courier</option>
                              <option value="Times-Roman">Times Serif</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedTool === 'form-field' && (
                      <div className="bg-gray-50 p-2.5 rounded-lg text-[10px] text-gray-500 space-y-1">
                        <p className="font-bold text-gray-700">Form Placement Instructions:</p>
                        <p>Click anywhere on the PDF page to add an input block. Switch back to select mode, type custom values directly on-screen, or reposition it onto blank fields!</p>
                      </div>
                    )}

                    {selectedTool === 'shape' && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <span className="block text-[10px] font-bold text-gray-500 mb-1.5">SHAPE SILHOUETTE</span>
                          <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                              type="button"
                              onClick={() => setShapeType('rectangle')}
                              className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${shapeType === 'rectangle' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              Rectangle
                            </button>
                            <button
                              type="button"
                              onClick={() => setShapeType('circle')}
                              className={`flex-1 py-1 text-[10px] font-bold rounded-md transition ${shapeType === 'circle' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              Circle
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedTool === 'drawing' && (
                      <div className="pt-2 space-y-2">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-500">STROKE WIDTH</span>
                            <span className="text-xs font-mono font-bold text-gray-800">{lineWidth}px</span>
                          </div>
                          <input
                            type="range"
                            min="1.5"
                            max="12"
                            step="0.5"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(Number(e.target.value))}
                            className="w-full accent-rose-600"
                          />
                        </div>
                      </div>
                    )}

                    {selectedTool === 'highlight' && (
                      <div className="bg-yellow-50 p-2 rounded-lg text-[10px] text-yellow-800 border border-yellow-100">
                        Select a neon high-opacity color, then click on the document viewport to add highlighter overlays. Resize or pull them straight over text sections to emphasize!
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ACTIVE ELEMENT CUSTOMIZER (ROBUST RESIZE, ROTATE, TRANSPARENCY & POSITION CONTROLS) */}
              {activeTab === 'elements' && (
                <div className="space-y-4">
                  {selectedAnno ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-rose-600 uppercase tracking-widest flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" /> Selected {selectedAnno.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteAnnotation(selectedAnno.id)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-0.5"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>

                      {/* Precise Text properties */}
                      {selectedAnno.type === 'text' && (
                        <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">REPLACE TEXT CONTENT</label>
                            <textarea
                              rows={2}
                              value={(selectedAnno as TextAnnotation).text}
                              onChange={(e) => updateSelectedProperty('text', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[10px] font-bold text-gray-500 mb-1">Size</span>
                              <input
                                type="number"
                                min="8"
                                max="72"
                                value={(selectedAnno as TextAnnotation).fontSize}
                                onChange={(e) => updateSelectedProperty('fontSize', Number(e.target.value))}
                                className="w-full bg-white border border-gray-200 rounded-lg p-1 text-xs text-center"
                              />
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-gray-500 mb-1">Font</span>
                              <select
                                value={(selectedAnno as TextAnnotation).fontFamily}
                                onChange={(e) => updateSelectedProperty('fontFamily', e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg p-1 text-xs"
                              >
                                <option value="Helvetica">Helvetica</option>
                                <option value="Courier">Courier</option>
                                <option value="Times-Roman">Times</option>
                              </select>
                            </div>
                          </div>

                          {/* Deco Toggles (Underline & Strikethrough) */}
                          <div>
                            <span className="block text-[10px] font-bold text-gray-500 mb-1.5">DECORATIONS</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateSelectedProperty('underline', !(selectedAnno as TextAnnotation).underline)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex justify-center items-center gap-1 leading-none ${
                                  (selectedAnno as TextAnnotation).underline 
                                    ? 'bg-rose-50 border-rose-300 text-rose-700' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                <UnderlineIcon className="h-3 w-3" /> Underline
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedProperty('strikethrough', !(selectedAnno as TextAnnotation).strikethrough)}
                                className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold flex justify-center items-center gap-1 leading-none ${
                                  (selectedAnno as TextAnnotation).strikethrough 
                                    ? 'bg-rose-50 border-rose-300 text-rose-700' 
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                <StrikethroughIcon className="h-3 w-3" /> Strikethrough
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Precise form fields properties */}
                      {selectedAnno.type === 'form-field' && (
                        <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">INPUT PLACEHOLDER</label>
                            <input
                              type="text"
                              value={(selectedAnno as FormFieldAnnotation).placeholder || ''}
                              onChange={(e) => updateSelectedProperty('placeholder', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs text-gray-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-500 mb-1">INPUT VALUE (TRIAL ANSWER)</label>
                            <input
                              type="text"
                              value={(selectedAnno as FormFieldAnnotation).fieldValue}
                              onChange={(e) => updateSelectedProperty('fieldValue', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-xs text-gray-800 font-medium"
                              placeholder="Type in editable form..."
                            />
                          </div>
                        </div>
                      )}

                      {/* ROTATION & OPACITY CONTROL SLIDERS (For all elements!) */}
                      <div className="space-y-4 pt-2 border-t border-gray-100">
                        
                        {/* OPACITY SLIDER */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Opacity / Transparency</span>
                            <span className="text-xs font-mono font-black text-gray-700">{Math.round((selectedAnno.opacity ?? 1.0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={selectedAnno.opacity ?? 1.0}
                            onChange={(e) => updateSelectedProperty('opacity', Number(e.target.value))}
                            className="w-full accent-rose-600"
                          />
                        </div>

                        {/* ROTATION SLIDER (Degrees 0-360) */}
                        {selectedAnno.type !== 'drawing' && selectedAnno.type !== 'highlight' && (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <RotateCw className="h-3 w-3 text-rose-500 animate-spin-slow" /> Rotate Orientation
                              </span>
                              <span className="text-xs font-mono font-black text-gray-700">{selectedAnno.rotation || 0}°</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              step="5"
                              value={selectedAnno.rotation || 0}
                              onChange={(e) => updateSelectedProperty('rotation', Number(e.target.value))}
                              className="w-full accent-rose-600"
                            />
                          </div>
                        )}

                        {/* PRECISE COORDINATE AND SIZE SLIDERS (W & H for shapes, form-fields, highlights, images, signatures) */}
                        {('width' in selectedAnno) && (
                          <div className="space-y-3 pt-2 border-t border-gray-100">
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dimension Scale Override</span>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[9px] font-bold text-gray-500 mb-1">WIDTH (%)</span>
                                <input
                                  type="number"
                                  min="2"
                                  max="99"
                                  value={Math.round((selectedAnno as any).width || 10)}
                                  onChange={(e) => updateSelectedProperty('width', Number(e.target.value))}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs text-center font-semibold"
                                />
                              </div>
                              <div>
                                <span className="block text-[9px] font-bold text-gray-500 mb-1">HEIGHT (%)</span>
                                <input
                                  type="number"
                                  min="2"
                                  max="99"
                                  value={Math.round((selectedAnno as any).height || 10)}
                                  onChange={(e) => updateSelectedProperty('height', Number(e.target.value))}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs text-center font-semibold"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Precise coordinates location modifier */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fine Location Align (X & Y)</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="block text-[9px] font-bold text-gray-500">POS X (%)</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={Math.round(selectedAnno.x)}
                                onChange={(e) => updateSelectedProperty('x', Number(e.target.value))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs text-center font-bold"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] font-bold text-gray-500">POS Y (%)</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={Math.round(selectedAnno.y)}
                                onChange={(e) => updateSelectedProperty('y', Number(e.target.value))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs text-center font-bold"
                              />
                            </div>
                          </div>
                          <span className="block text-[9px] text-gray-400">Pro-Tip: When selected, draggable overlays also support Drag & Drop!</span>
                        </div>

                        {/* Color preset swatches for lines, shapes, text */}
                        {('color' in selectedAnno) && (
                          <div className="border-t border-gray-100 pt-3">
                            <span className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase">Change Color</span>
                            <div className="flex flex-wrap gap-1.5">
                              {getPresetColors().map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => updateSelectedProperty('color', c)}
                                  style={{ backgroundColor: c }}
                                  className={`h-5 w-5 rounded-full border transition transform hover:scale-110 ${
                                    selectedAnno.color === c ? 'ring-2 ring-rose-500 border-white' : 'border-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4 border border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                      <Layers className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">No elements selected</p>
                      <p className="text-[10px] text-gray-400 mt-1">Switch to "Select & Move" tool, then click on any added element/text to inspect and adjust styling.</p>
                    </div>
                  )}

                  {/* List of additions to enable sequential layers monitoring */}
                  {annotations.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Addition Hierarchy list ({annotations.length})</span>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                        {annotations.map((anno) => (
                          <div 
                            key={anno.id} 
                            onClick={() => {
                              setSelectedAnnoId(anno.id);
                              setSelectedTool('select');
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition ${
                              selectedAnnoId === anno.id 
                                ? 'bg-rose-50/70 border-rose-300 text-rose-800 font-bold' 
                                : 'bg-gray-50 hover:bg-gray-100 border-transparent text-gray-600'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (anno as any).color || '#888' }} />
                              [{anno.type.toUpperCase()}] {anno.type === 'text' ? (anno as any).text : (anno as any).fieldName || `Page ${anno.pageIndex + 1}`}
                            </span>
                            <button 
                              type="button" 
                              onClick={(e) => deleteAnnotation(anno.id, e)}
                              className="text-gray-400 hover:text-rose-600 p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: EXTRACT EXISTING TEXT CONTROLS */}
              {activeTab === 'scan' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-rose-600 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Native Text Digitization
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Would you like to edit text that is already printed inside the document? Clicking "Scan Document" will automatically parse and convert existing raster text characters into standard editable overlays!
                  </p>

                  <button
                    type="button"
                    disabled={isScanningText}
                    onClick={scanExistingPdfText}
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isScanningText ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scanning Characters...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Scan Document for Editable Text
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-gray-400 text-center leading-snug">
                    Running full browser-cached parsing. Works with dynamic vectors, layout tables, and metadata text structures.
                  </p>
                </div>
              )}
            </div>

            {/* Redesigned bottom actions compilation */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-2.5">
              {editedBlobUrl ? (
                <div className="space-y-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-[11px] flex gap-2 font-medium">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Annotations compiled physically to PDF bytes successfully. Ready to export!</span>
                  </div>
                  <a
                    href={editedBlobUrl}
                    download={`edited_${file.name}`}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
                  >
                    <Download className="h-4 w-4" /> Save PDF Document
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedBlobUrl(null);
                      setAnnotations([]);
                      setSelectedAnnoId(null);
                    }}
                    className="w-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-xl text-[11px] flex items-center justify-center gap-1 transition"
                  >
                    <RefreshCw className="h-3 w-3" /> Clear All Elements
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={annotations.length === 0 || isProcessing}
                  onClick={handleSaveCompiledPDF}
                  className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5 ${
                    annotations.length === 0 || isProcessing
                      ? 'bg-rose-400 cursor-not-allowed opacity-80'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-md transform hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Blending changes...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Export Edited PDF
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: Document scrolling pages viewport rendering */}
          <div className="lg:col-span-3 space-y-8 max-h-[80vh] overflow-y-auto bg-gray-100/60 p-6 rounded-2xl border border-gray-200/50">
            <div className="flex justify-between items-center bg-white px-4 py-2.5 border border-gray-200 rounded-xl mb-4 shadow-xs">
              <span className="text-xs font-semibold text-gray-500">File: {file.name} | Pages: {totalPages}</span>
              
              <div className="flex bg-gray-100/80 rounded-lg p-0.5 border border-gray-200/50 items-center gap-1">
                <button 
                  type="button" 
                  onClick={() => setZoom(Math.max(50, zoom - 10))} 
                  className="p-1 rounded hover:bg-white text-gray-700 transition" 
                  title="Zoom out"
                >
                  <ZoomOut className="h-4.5 w-4.5 text-gray-500" />
                </button>
                <span className="text-[11px] font-mono font-black select-none px-2 text-gray-600 min-w-[42px] text-center">{zoom}%</span>
                <button 
                  type="button" 
                  onClick={() => setZoom(Math.min(150, zoom + 10))} 
                  className="p-1 rounded hover:bg-white text-gray-700 transition" 
                  title="Zoom in"
                >
                  <ZoomIn className="h-4.5 w-4.5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-8">
              {Array.from({ length: totalPages || 0 }).map((_, idx) => {
                const dims = pageDimensions[idx] || { width: 595, height: 842 };
                const displayWidth = Math.round(dims.width * (zoom / 100));
                const displayHeight = Math.round(dims.height * (zoom / 100));

                return (
                  <div key={idx} className="relative shadow-lg ring-1 ring-black/5 rounded-sm bg-white" style={{ width: displayWidth, height: displayHeight }}>
                    
                    {/* Visual annotation layers panel */}
                    <div 
                      ref={(el) => { if (el) pageContainerRefs.current[idx] = el; }}
                      onClick={(e) => handlePageClick(idx, e)}
                      onMouseDown={(e) => handleMouseDown(idx, e)}
                      onMouseMove={(e) => handleMouseMove(idx, e)}
                      onMouseUp={handleMouseUp}
                      className={`absolute inset-0 z-20 pointer-events-auto select-none ${
                        selectedTool === 'drawing' ? 'cursor-crosshair' : selectedTool !== 'select' ? 'cursor-cell' : 'cursor-default'
                      }`}
                    >
                      {/* Drawings rendering */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {annotations
                          .filter((a) => a.pageIndex === idx && a.type === 'drawing')
                          .map((a: any) => (
                            <polyline
                              key={a.id}
                              points={a.points.map((p: any) => `${(p.x / 100) * displayWidth},${(p.y / 100) * displayHeight}`).join(' ')}
                              fill="none"
                              stroke={a.color}
                              strokeWidth={(a.lineWidth || 4) * (zoom / 100)}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="pointer-events-auto cursor-pointer hover:stroke-rose-600 active:stroke-rose-700 transition"
                              style={{ opacity: a.opacity ?? 1.0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnnoId(a.id);
                              }}
                            />
                        ))}
                        
                        {/* Currently active drawing preview */}
                        {isDrawing && drawingPageIdx === idx && activeDrawingPoints.length > 1 && (
                          <polyline
                            points={activeDrawingPoints.map((p) => `${(p.x / 100) * displayWidth},${(p.y / 100) * displayHeight}`).join(' ')}
                            fill="none"
                            stroke={activeColor}
                            strokeWidth={lineWidth * (zoom / 100)}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ opacity: opacity }}
                          />
                        )}
                      </svg>

                      {/* Live whiteout mask overlays to cover original text on canvas when modified or deleted */}
                      {annotations
                        .filter((a) => a.pageIndex === idx && (a as any).isExisting)
                        .map((anno: any) => {
                          const isModified = anno.text !== anno.originalText || anno.x !== anno.originalX || anno.y !== anno.originalY;
                          const isDeleted = anno.isDeleted;

                          if (isModified || isDeleted) {
                            const maskHeight = (anno.originalHeight || 2.0) * 1.35;
                            return (
                              <div
                                key={`mask-${anno.id}`}
                                className="absolute bg-white pointer-events-none"
                                style={{
                                  left: `${anno.originalX - 0.2}%`,
                                  top: `${anno.originalY}%`,
                                  width: `${anno.originalWidth + 0.4}%`,
                                  height: `${maskHeight}%`,
                                  transform: 'translateY(-88%)', // Shift upwards precisely from baseline
                                  zIndex: 5
                                }}
                              />
                            );
                          }
                          return null;
                        })}

                      {/* Display custom overlay additions */}
                      {annotations
                        .filter((a) => a.pageIndex === idx && !(a as any).isDeleted)
                        .map((anno) => {
                          const isSelected = selectedAnnoId === anno.id;
                          const isExisting = (anno as any).isExisting;
                          const isModified = isExisting && (
                            anno.text !== (anno as any).originalText ||
                            anno.x !== (anno as any).originalX ||
                            anno.y !== (anno as any).originalY
                          );

                          // Text Render
                          if (anno.type === 'text') {
                            const isCurrentlyEditing = editingAnnoId === anno.id;
                            const shouldLabelBeTransparent = isExisting && !isModified && !isCurrentlyEditing;

                            return (
                              <div
                                key={anno.id}
                                style={{
                                  left: `${anno.x}%`,
                                  top: `${anno.y}%`,
                                  color: shouldLabelBeTransparent ? 'transparent' : anno.color,
                                  fontSize: `${anno.fontSize * (zoom / 100)}px`,
                                  fontFamily: anno.fontFamily,
                                  opacity: anno.opacity ?? 1.0,
                                  transform: `translateY(-80%) rotate(${anno.rotation || 0}deg)`,
                                  transformOrigin: 'left center',
                                  zIndex: isSelected ? 30 : 10
                                }}
                                onMouseDown={(e) => {
                                  if (selectedTool !== 'select') return;
                                  if (editingAnnoId === anno.id) return; // ignore mouse drag inside active edit input
                                  e.stopPropagation();
                                  setSelectedAnnoId(anno.id);
                                  setDragState({
                                    id: anno.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startAnnoX: anno.x,
                                    startAnnoY: anno.y
                                  });
                                }}
                                className={`absolute p-0.5 px-1.5 rounded-xs cursor-move select-text inline-flex items-center gap-1.5 transition ${
                                  isSelected 
                                    ? isExisting && !isModified
                                      ? 'border border-blue-500 bg-blue-500/5 shadow-xs'
                                      : 'ring-2 ring-rose-500 bg-rose-50/80 shadow-md' 
                                    : isExisting && !isModified
                                      ? 'hover:border hover:border-dashed hover:border-blue-400 hover:bg-blue-50/10' 
                                      : 'hover:bg-rose-50/40 hover:ring-1 hover:ring-rose-200'
                                }`}
                              >
                                {editingAnnoId === anno.id ? (
                                  <input
                                    type="text"
                                    value={anno.text}
                                    onChange={(e) => {
                                      setAnnotations((prev) => prev.map((a) => {
                                        if (a.id === anno.id) {
                                          return { ...a, text: e.target.value } as TextAnnotation;
                                        }
                                        return a;
                                      }));
                                    }}
                                    onBlur={() => setEditingAnnoId(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setEditingAnnoId(null);
                                      }
                                    }}
                                    className="bg-white border border-blue-500 rounded px-1.5 py-0.5 text-gray-900 font-sans focus:outline-none pointer-events-auto cursor-text shadow-sm"
                                    style={{ 
                                      fontFamily: 'inherit', 
                                      fontSize: 'inherit', 
                                      color: anno.color,
                                      width: `${Math.max(60, anno.text.length * anno.fontSize * 0.55 * (zoom / 100))}px`
                                    }}
                                    autoFocus
                                    onMouseDown={(ev) => ev.stopPropagation()}
                                  />
                                ) : (
                                  <span 
                                    className={`${anno.underline ? 'underline' : ''} ${anno.strikethrough ? 'line-through' : ''}`}
                                    style={{
                                      color: shouldLabelBeTransparent ? 'transparent' : 'inherit'
                                    }}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedAnnoId(anno.id);
                                      setEditingAnnoId(anno.id);
                                    }}
                                    title="Double-click to edit inline"
                                  >
                                    {anno.text}
                                  </span>
                                )}
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => deleteAnnotation(anno.id, e)}
                                    className="p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
                                    title="Delete tag"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // Form field dynamic interactive rendering
                          if (anno.type === 'form-field') {
                            return (
                              <div
                                key={anno.id}
                                style={{
                                  left: `${anno.x}%`,
                                  top: `${anno.y}%`,
                                  width: `${anno.width}%`,
                                  height: `${anno.height}%`,
                                  opacity: anno.opacity ?? 1.0,
                                  transform: `rotate(${anno.rotation || 0}deg)`
                                }}
                                onMouseDown={(e) => {
                                  // Dragging if clicking border/outer wrapper
                                  if (selectedTool !== 'select') return;
                                  if ((e.target as any).tagName === 'INPUT') return; // let text selection flow inside input
                                  e.stopPropagation();
                                  setSelectedAnnoId(anno.id);
                                  setDragState({
                                    id: anno.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startAnnoX: anno.x,
                                    startAnnoY: anno.y
                                  });
                                }}
                                className={`absolute bg-blue-50/50 hover:bg-blue-50 border border-blue-400 p-1 rounded cursor-move flex items-center justify-between ${
                                  isSelected ? 'ring-2 ring-rose-500 bg-rose-50/90 z-30' : ''
                                }`}
                              >
                                <input
                                  type="text"
                                  value={anno.fieldValue}
                                  placeholder={anno.placeholder || 'Type answers here...'}
                                  onChange={(e) => {
                                    setAnnotations((prev) => prev.map((a) => {
                                      if (a.id === anno.id) {
                                        return { ...a, fieldValue: e.target.value } as FormFieldAnnotation;
                                      }
                                      return a;
                                    }));
                                  }}
                                  className="w-full h-full bg-transparent border-none text-[12px] font-bold text-gray-800 focus:outline-none placeholder-blue-400/80 px-1 pointer-events-auto cursor-text"
                                />

                                {isSelected && (
                                  <div className="flex gap-1 shrink-0 ml-1">
                                    <button
                                      type="button"
                                      onClick={(e) => deleteAnnotation(anno.id, e)}
                                      className="p-1 rounded bg-rose-500 text-white hover:bg-rose-600 cursor-pointer"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Resize handle */}
                                {isSelected && (
                                  <div 
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setDragState({
                                        id: anno.id,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startAnnoX: anno.x,
                                        startAnnoY: anno.y,
                                        startWidth: anno.width,
                                        startHeight: anno.height,
                                        isResizing: true,
                                        handleType: 'se'
                                      });
                                    }}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-rose-600 rounded-tl-sm cursor-se-resize z-50 rounded-br-xs"
                                  />
                                )}
                              </div>
                            );
                          }

                          // Shape Render
                          if (anno.type === 'shape') {
                            return (
                              <div
                                key={anno.id}
                                style={{
                                  left: `${anno.x}%`,
                                  top: `${anno.y}%`,
                                  width: `${anno.width}%`,
                                  height: `${anno.height}%`,
                                  backgroundColor: `${anno.color}30`, // semi transparent background display
                                  borderColor: anno.color,
                                  borderWidth: `${anno.borderWidth}px`,
                                  borderRadius: anno.shapeType === 'circle' ? '9999px' : '4px',
                                  opacity: anno.opacity ?? 1.0,
                                  transform: `rotate(${anno.rotation || 0}deg)`
                                }}
                                onMouseDown={(e) => {
                                  if (selectedTool !== 'select') return;
                                  e.stopPropagation();
                                  setSelectedAnnoId(anno.id);
                                  setDragState({
                                    id: anno.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startAnnoX: anno.x,
                                    startAnnoY: anno.y
                                  });
                                }}
                                className={`absolute cursor-move inline-flex items-start justify-end p-1 transition ${
                                  isSelected ? 'ring-2 ring-rose-500 shadow-md z-30' : 'hover:ring-1 hover:ring-rose-400'
                                }`}
                              >
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => deleteAnnotation(anno.id, e)}
                                    className="p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 absolute -top-3 -right-3 shadow-md"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Corner Resize handle */}
                                {isSelected && (
                                  <div 
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setDragState({
                                        id: anno.id,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startAnnoX: anno.x,
                                        startAnnoY: anno.y,
                                        startWidth: anno.width,
                                        startHeight: anno.height,
                                        isResizing: true,
                                        handleType: 'se'
                                      });
                                    }}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-rose-600 rounded-tl-sm cursor-se-resize z-50 rounded-br-xs"
                                  />
                                )}
                              </div>
                            );
                          }

                          // Highlight overlay Render
                          if (anno.type === 'highlight') {
                            return (
                              <div
                                key={anno.id}
                                style={{
                                  left: `${anno.x}%`,
                                  top: `${anno.y}%`,
                                  width: `${anno.width}%`,
                                  height: `${anno.height}%`,
                                  backgroundColor: anno.color,
                                  opacity: anno.opacity ?? 0.4
                                }}
                                onMouseDown={(e) => {
                                  if (selectedTool !== 'select') return;
                                  e.stopPropagation();
                                  setSelectedAnnoId(anno.id);
                                  setDragState({
                                    id: anno.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startAnnoX: anno.x,
                                    startAnnoY: anno.y
                                  });
                                }}
                                className={`absolute cursor-move inline-flex items-start justify-end border border-yellow-300 border-dashed ${
                                  isSelected ? 'ring-2 ring-rose-500 z-30' : 'hover:ring-1 hover:ring-rose-400'
                                }`}
                              >
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => deleteAnnotation(anno.id, e)}
                                    className="p-0.5 rounded bg-rose-500 text-white hover:bg-rose-600 absolute -top-4 -right-1"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                )}

                                {isSelected && (
                                  <div 
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setDragState({
                                        id: anno.id,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startAnnoX: anno.x,
                                        startAnnoY: anno.y,
                                        startWidth: anno.width,
                                        startHeight: anno.height,
                                        isResizing: true,
                                        handleType: 'se'
                                      });
                                    }}
                                    className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-rose-600 cursor-se-resize z-40"
                                  />
                                )}
                              </div>
                            );
                          }

                          // Signature Render
                          if (anno.type === 'signature') {
                            return (
                              <div
                                key={anno.id}
                                style={{
                                  left: `${anno.x}%`,
                                  top: `${anno.y}%`,
                                  width: `${anno.width}%`,
                                  height: `${anno.height}%`,
                                  opacity: anno.opacity ?? 1.0,
                                  transform: `rotate(${anno.rotation || 0}deg)`
                                }}
                                onMouseDown={(e) => {
                                  if (selectedTool !== 'select') return;
                                  e.stopPropagation();
                                  setSelectedAnnoId(anno.id);
                                  setDragState({
                                    id: anno.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startAnnoX: anno.x,
                                    startAnnoY: anno.y
                                  });
                                }}
                                className={`absolute cursor-move select-none p-1 border border-zinc-200 bg-white/70 ${
                                  isSelected ? 'ring-2 ring-rose-600 z-30' : 'hover:bg-gray-100/50'
                                }`}
                              >
                                <img
                                  src={anno.signatureUrl}
                                  alt="Signature element"
                                  className="w-full h-full object-contain pointer-events-none"
                                />
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => deleteAnnotation(anno.id, e)}
                                    className="p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 absolute -top-3 -right-3 shadow-md"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}

                                {isSelected && (
                                  <div 
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setDragState({
                                        id: anno.id,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startAnnoX: anno.x,
                                        startAnnoY: anno.y,
                                        startWidth: anno.width,
                                        startHeight: anno.height,
                                        isResizing: true,
                                        handleType: 'se'
                                      });
                                    }}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-rose-600 cursor-se-resize z-40 rounded-br-xs"
                                  />
                                )}
                              </div>
                            );
                          }

                          // Image Render
                          if (anno.type === 'image') {
                            return (
                              <div
                                key={anno.id}
                                style={{
                                  left: `${anno.x}%`,
                                  top: `${anno.y}%`,
                                  width: `${anno.width}%`,
                                  height: `${anno.height}%`,
                                  opacity: anno.opacity ?? 1.0,
                                  transform: `rotate(${anno.rotation || 0}deg)`
                                }}
                                onMouseDown={(e) => {
                                  if (selectedTool !== 'select') return;
                                  e.stopPropagation();
                                  setSelectedAnnoId(anno.id);
                                  setDragState({
                                    id: anno.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    startAnnoX: anno.x,
                                    startAnnoY: anno.y
                                  });
                                }}
                                className={`absolute cursor-move select-none border border-transparent ${
                                  isSelected ? 'ring-2 ring-rose-600 z-30' : 'hover:ring-1 hover:ring-rose-400'
                                }`}
                              >
                                <img
                                  src={anno.imageUrl}
                                  alt="Inserted item"
                                  className="w-full h-full object-cover rounded-sm pointer-events-none"
                                  referrerPolicy="no-referrer"
                                />
                                {isSelected && (
                                  <button
                                    type="button"
                                    onClick={(e) => deleteAnnotation(anno.id, e)}
                                    className="p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 absolute -top-3 -right-3 shadow-md"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}

                                {isSelected && (
                                  <div 
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setDragState({
                                        id: anno.id,
                                        startX: e.clientX,
                                        startY: e.clientY,
                                        startAnnoX: anno.x,
                                        startAnnoY: anno.y,
                                        startWidth: anno.width,
                                        startHeight: anno.height,
                                        isResizing: true,
                                        handleType: 'se'
                                      });
                                    }}
                                    className="absolute bottom-0 right-0 w-3 h-3 bg-rose-600 cursor-se-resize z-40 rounded-br-xs"
                                  />
                                )}
                              </div>
                            );
                          }

                          return null;
                      })}

                      {/* Image uploader file triggers overlaid for easy access on page */}
                      {selectedTool === 'image' && (
                        <div className="absolute inset-0 bg-rose-50/10 hover:bg-rose-50/30 transition border-2 border-dashed border-rose-500/20 rounded flex flex-col items-center justify-center p-4">
                          <ImageIcon className="h-8 w-8 text-rose-500 mb-2 animate-bounce" />
                          <label className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                            Click to Select Image for Page {idx + 1}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadImageAnnotation(idx, e)}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* PDFJS Rendered Image Canvas Layer */}
                    {pdfJsDoc && (
                      <PDFPageRenderer 
                        pageIndex={idx}
                        pdfJsDoc={pdfJsDoc}
                        zoom={zoom}
                      />
                    )}

                    {/* Fallback box representation if PDFJS is rendering */}
                    <div className="absolute inset-0 z-0 bg-white border border-gray-200 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">PAGE {idx + 1}</span>
                      <span className="text-[9px] text-gray-400">Loading graphics... {dims.width} x {dims.height}</span>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL WINDOW: SIGNATURE PAD DRAWING BOARD */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" id="signature-interactive-touchpad">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <PenTool className="h-5 w-5" /> Signature Drawing Pad
                </h3>
                <p className="text-[11px] text-rose-100 mt-1">Scribble your initials or signatures directly in the grid canvas below.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSignatureModal(false)}
                className="text-white hover:bg-rose-700/50 p-1.5 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">DRAWING VIEWPORT</span>
              
              <div className="border border-gray-200 rounded-xl bg-gray-50/50 p-1">
                <canvas
                  ref={sigCanvasRef}
                  width={460}
                  height={220}
                  onMouseDown={startSigDrawing}
                  onMouseMove={drawSig}
                  onMouseUp={() => setIsSigDrawing(false)}
                  onMouseLeave={() => setIsSigDrawing(false)}
                  className="w-full bg-white rounded-lg border border-dashed border-gray-300 cursor-needle shadow-inner touch-none"
                  style={{ minHeight: '220px' }}
                />
              </div>

              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase">PEN COLOR:</span>
                  <div className="flex gap-1.5">
                    {['#111827', '#0000FF', '#FF0000'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-5 w-5 rounded-full border transition transform hover:scale-110 ${
                          activeColor === c ? 'ring-2 ring-rose-500 border-white' : 'border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearSigCanvas}
                  className="text-xs font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Clear Pad
                </button>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSignature}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" /> Add to PDF Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PDFPageRendererProps {
  pageIndex: number;
  pdfJsDoc: pdfjs.PDFDocumentProxy;
  zoom: number;
}

function PDFPageRenderer({ pageIndex, pdfJsDoc, zoom }: PDFPageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const render = async () => {
      if (!pdfJsDoc) return;
      try {
        const page = await pdfJsDoc.getPage(pageIndex + 1);
        const canvas = canvasRef.current;
        if (!canvas || !isCurrent) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Render at slightly higher resolution
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext as any).promise;
      } catch (err) {
        console.warn(`Failed rendering page ${pageIndex + 1}:`, err);
      }
    };

    render();
    return () => {
      isCurrent = false;
    };
  }, [pdfJsDoc, pageIndex, zoom]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 bg-white z-10 w-full h-full rounded-sm"
    />
  );
}
