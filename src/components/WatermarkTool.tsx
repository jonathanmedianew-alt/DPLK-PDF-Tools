import React, { useState, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { 
  FileText, ArrowLeft, Stamp, Image as ImageIcon, 
  Type, Sliders, Trash2, Download, Upload, 
  Sparkles, RefreshCw, Check, Info, AlertCircle, 
  RotateCw, AlignCenter, LayoutGrid, CheckCircle2
} from 'lucide-react';

interface WatermarkToolProps {
  onBack: () => void;
}

export default function WatermarkTool({ onBack }: WatermarkToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [fileSize, setFileSize] = useState<string>('');
  
  // Watermark types: 'text' or 'image'
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  
  // Text watermark characteristics
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState<'Helvetica' | 'Courier' | 'Times-Roman'>('Helvetica');
  const [textColor, setTextColor] = useState('#EF4444'); // Red
  const [fontSize, setFontSize] = useState(52);
  const [rotationAngle, setRotationAngle] = useState(45); // degrees
  
  // Image watermark characteristics
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(100); // 50 - 200

  // Shared characteristics
  const [opacity, setOpacity] = useState(30); // percentages (10 - 100)
  const [position, setPosition] = useState<'center' | 'top-right' | 'bottom-left' | 'top-left' | 'bottom-right' | 'repeat'>('center');
  
  // Action state handling
  const [isProcessing, setIsProcessing] = useState(false);
  const [watermarkedUrl, setWatermarkedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load PDF file metadata
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    processPdfMetadata(e.target.files[0]);
  };

  const processPdfMetadata = async (selected: File) => {
    if (selected.type !== 'application/pdf') {
      setError('Only standard PDF files are supported.');
      return;
    }
    setError(null);
    setWatermarkedUrl(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      const buffer = await selected.arrayBuffer();
      // Test-parse the document
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      setFile(selected);
      setTotalPages(pdfDoc.getPageCount());
      setFileSize((selected.size / (1024 * 1024)).toFixed(2) + ' MB');
    } catch (err: any) {
      console.error(err);
      setError('Could not read PDF. It might be password-secured or corrupted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      processPdfMetadata(e.dataTransfer.files[0]);
    }
  };

  // Image watermark uploader converter
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileSelected = e.target.files?.[0];
    if (!fileSelected) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageFile(event.target?.result as string);
    };
    reader.readAsDataURL(fileSelected);
  };

  // Convert hex color to rgb percentage formatting
  const hexToRGBFloat = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  // Compile watermarking directly using pdf-lib!
  const compileWatermarkedPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setWatermarkedUrl(null);

    try {
      // 1. Load document bytes
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      const pageCount = pdfDoc.getPageCount();
      const normOpacity = opacity / 100;
      const rgbColor = hexToRGBFloat(textColor);

      // Prepare font if text mode is selected
      let standardFont;
      if (watermarkType === 'text') {
        const fontName = fontFamily === 'Courier' ? StandardFonts.CourierBold
                       : fontFamily === 'Times-Roman' ? StandardFonts.TimesRomanBold
                       : StandardFonts.HelveticaBold;
        standardFont = await pdfDoc.embedFont(fontName);
      }

      // Prepare image embedded layer if image mode is selected
      let embeddedImg: any = null;
      if (watermarkType === 'image') {
        if (!imageFile) {
          throw new Error('Please select a visual watermark image to stamp.');
        }
        // Embed the base64 image layer
        const imgBytes = await fetch(imageFile).then(res => res.arrayBuffer());
        embeddedImg = await pdfDoc.embedPng(imgBytes);
      }

      // Iterate and draw over every page of the PDF!
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();

        if (watermarkType === 'text' && standardFont) {
          // 2a. Add Text Watermark layers
          const textWidth = standardFont.widthOfTextAtSize(watermarkText, fontSize);
          const textHeight = standardFont.heightAtSize(fontSize);

          // Position calculation offsets
          let x = width / 2;
          let y = height / 2;

          if (position === 'top-left') {
            x = 80;
            y = height - 100;
          } else if (position === 'top-right') {
            x = width - textWidth - 80;
            y = height - 100;
          } else if (position === 'bottom-left') {
            x = 80;
            y = 100;
          } else if (position === 'bottom-right') {
            x = width - textWidth - 80;
            y = 100;
          }

          if (position === 'repeat') {
            // Draw grid of stamps
            for (let gridX = 40; gridX < width; gridX += 180) {
              for (let gridY = 60; gridY < height; gridY += 180) {
                page.drawText(watermarkText, {
                  x: gridX,
                  y: gridY,
                  font: standardFont,
                  size: fontSize * 0.5, // slightly smaller for layout tiling
                  color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
                  opacity: normOpacity,
                  rotate: degrees(rotationAngle),
                });
              }
            }
          } else if (position === 'center') {
            // Draw perfectly angled single watermark
            page.drawText(watermarkText, {
              x: width / 2 - textWidth / 2,
              y: height / 2,
              font: standardFont,
              size: fontSize,
              color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
              opacity: normOpacity,
              rotate: degrees(rotationAngle),
            });
          } else {
            // Standard preset placements
            page.drawText(watermarkText, {
              x,
              y,
              font: standardFont,
              size: fontSize * 0.7,
              color: rgb(rgbColor.r, rgbColor.g, rgbColor.b),
              opacity: normOpacity,
              rotate: degrees(rotationAngle),
            });
          }
        } 
        else if (watermarkType === 'image' && embeddedImg) {
          // 2b. Add Image Watermark layers
          const normWidth = embeddedImg.width * (imageScale / 100) * 0.45;
          const normHeight = embeddedImg.height * (imageScale / 100) * 0.45;

          let posX = width / 2 - normWidth / 2;
          let posY = height / 2 - normHeight / 2;

          if (position === 'top-left') {
            posX = 50;
            posY = height - normHeight - 50;
          } else if (position === 'top-right') {
            posX = width - normWidth - 50;
            posY = height - normHeight - 50;
          } else if (position === 'bottom-left') {
            posX = 50;
            posY = 50;
          } else if (position === 'bottom-right') {
            posX = width - normWidth - 50;
            posY = 50;
          }

          if (position === 'repeat') {
            for (let tx = 30; tx < width; tx += 160) {
              for (let ty = 30; ty < height; ty += 160) {
                page.drawImage(embeddedImg, {
                  x: tx,
                  y: ty,
                  width: normWidth * 0.6,
                  height: normHeight * 0.6,
                  opacity: normOpacity,
                });
              }
            }
          } else {
            page.drawImage(embeddedImg, {
              x: posX,
              y: posY,
              width: normWidth,
              height: normHeight,
              opacity: normOpacity,
            });
          }
        }
      }

      // 5. Generate and download blobs
      const modifiedPdfBytes = await pdfDoc.save();
      const outputBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const outputUrl = URL.createObjectURL(outputBlob);

      setWatermarkedUrl(outputUrl);
      setSuccessMsg('Successfully stamped all page layers with watermark!');
      confetti({
        particleCount: 110,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error(err);
      setError('Conversion failed: ' + (err.message || 'Watermarking parsing exception.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-screen pb-16" id="watermark-tool-root">
      
      {/* Navbar Banner jumbotron */}
      <div className="bg-slate-900 text-white py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1 px-3 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-slate-300 hover:text-white transition text-xs font-bold"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>DPLK Tools Hub</span>
            </button>
            <div className="h-5 w-[1px] bg-slate-700"></div>
            <div className="flex items-center gap-2">
              <div className="bg-teal-600 p-1.5 rounded-lg">
                <Stamp className="h-4 w-4 text-white" />
              </div>
              <h1 className="font-sans font-bold text-sm sm:text-base tracking-tight text-white">
                PDF Watermark Stamp
              </h1>
            </div>
          </div>
          <div className="text-[10px] font-mono text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
            DPLK Watermark Machine v1.0 • Client Secured
          </div>
        </div>
      </div>

      {/* Main Grid View panels */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        
        {!file ? (
          /* Step 1: Upload Layout */
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-2xl p-12 bg-white text-center cursor-pointer transition shadow-xs max-w-2xl mx-auto"
            onClick={() => document.getElementById('watermark-file-input')?.click()}
          >
            <div className="h-16 w-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600">
              <Stamp className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Select PDF file to Watermark
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
              Drag and drop your PDF file here, or select files through standard system explorer paths
            </p>
            <button
              type="button"
              className="p-2 px-6 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-teal-600/15"
            >
              Select PDF File
            </button>
            <input
              id="watermark-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {error && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg text-red-700 text-xs border border-red-100 flex items-center gap-2 justify-center">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Editor Panels grid layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Watermark Styling settings */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-4.5">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-450" />
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 max-w-[180px] truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {totalPages} pages • {fileSize}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 font-bold text-[10px] flex items-center gap-1 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Watermark mode switch: text or image overlay */}
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition ${
                    watermarkType === 'text' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  <Type className="h-3.5 w-3.5" />
                  <span>Text Watermark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition ${
                    watermarkType === 'image' ? 'bg-white text-teal-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Image Logo Stamp</span>
                </button>
              </div>

              {/* Dynamic properties pane based on watermarkType */}
              {watermarkType === 'text' ? (
                <div className="flex flex-col gap-3.5 text-xs">
                  <div>
                    <label className="text-xs text-gray-600 font-bold block mb-1">Watermark Stamp Text:</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="e.g. DRAFT, COPY, DPLK SECURE"
                      maxLength={36}
                      className="w-full bg-white border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-lg p-2 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 font-medium block mb-1">Font Typography:</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value as any)}
                        className="bg-white border border-gray-200 rounded-lg p-1.5 w-full text-xs focus:outline-none"
                      >
                        <option value="Helvetica">Helvetica Bold</option>
                        <option value="Times-Roman">Times New Roman</option>
                        <option value="Courier">Courier Monospace</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-500 font-medium block mb-1">Color Picker:</label>
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1.5">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-5 h-5 border-none p-0 cursor-pointer rounded bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-slate-500">{textColor}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-gray-500 font-medium block mb-1">Font Size ({fontSize}px):</label>
                      <input
                        type="range"
                        min={16}
                        max={110}
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-500 font-medium block mb-1">Rotate Angle ({rotationAngle}°):</label>
                      <input
                        type="range"
                        min={-90}
                        max={90}
                        value={rotationAngle}
                        onChange={(e) => setRotationAngle(parseInt(e.target.value, 10))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode: Image Watermarking */
                <div className="flex flex-col gap-3.5 text-xs">
                  <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 text-center">
                    {imageFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={imageFile} className="max-h-24 object-contain rounded bg-white p-2 border" />
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          className="text-[10px] text-red-600 hover:underline font-bold"
                        >
                          Remove select logo
                        </button>
                      </div>
                    ) : (
                      <div className="cursor-pointer" onClick={() => document.getElementById('watermark-logo-picker')?.click()}>
                        <ImageIcon className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                        <p className="font-bold text-slate-600">Upload your logo graphics</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Transparent PNG format is highly recommended</p>
                        <input
                          id="watermark-logo-picker"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageImport}
                        />
                      </div>
                    )}
                  </div>

                  {imageFile && (
                    <div>
                      <label className="text-[11px] text-gray-500 font-medium block mb-1">Image Size Scale ({imageScale}%):</label>
                      <input
                        type="range"
                        min={30}
                        max={180}
                        value={imageScale}
                        onChange={(e) => setImageScale(parseInt(e.target.value, 10))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Shared parameters placement layout option list */}
              <div className="border-t border-gray-100 pt-3.5 flex flex-col gap-3 text-xs">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                      Position Alignment:
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className="bg-white border border-gray-200 rounded-xl p-1.5 w-full focus:outline-none"
                    >
                      <option value="center">Centered (In middle)</option>
                      <option value="top-left">Top Left Corner</option>
                      <option value="top-right">Top Right Corner</option>
                      <option value="bottom-left">Bottom Left Corner</option>
                      <option value="bottom-right">Bottom Right Corner</option>
                      <option value="repeat">Repeat Tiled Overlay Grid</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-500 font-bold block mb-1 uppercase tracking-wider">
                      Stamp Opacity ({opacity}%):
                    </label>
                    <input
                      type="range"
                      min={5}
                      max={95}
                      value={opacity}
                      onChange={(e) => setOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-teal-600 mt-1 cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Final Watermark compilation drawer */}
              <div className="border-t border-gray-100 pt-3.5 flex flex-col gap-2">
                
                {error && (
                  <div className="p-3 bg-red-50 rounded-lg text-red-700 text-xs border border-red-100 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 text-xs border border-emerald-100 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {!watermarkedUrl ? (
                  <button
                    type="button"
                    onClick={compileWatermarkedPdf}
                    disabled={isProcessing}
                    className="w-full p-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-teal-600/15 disabled:bg-teal-400"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Rendering layers & saving content...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Apply Watermark to File</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <a
                      href={watermarkedUrl}
                      download={`Watermarked_${file.name}`}
                      className="flex-1 p-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition text-center flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Watermarked PDF</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => { setWatermarkedUrl(null); setSuccessMsg(null); }}
                      className="p-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition"
                      title="Watermark Another File"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                )}

              </div>

            </div>

            {/* RIGHT COLUMN: Interactive live paper preview coordinates */}
            <div className="lg:col-span-7 flex flex-col items-center">
              
              <div className="w-full bg-slate-200/90 border border-slate-300 rounded-t-2xl p-2 px-4 flex items-center justify-between text-[11px] text-gray-500 print:hidden font-sans">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5 text-teal-600" />
                  <span className="font-bold">Realtime visual watermark orientation</span>
                </div>
                <span>Stamping Level: All Pages</span>
              </div>

              {/* Simulated visual layout sheet container */}
              <div className="w-full bg-white border border-slate-300 rounded-b-2xl p-6 sm:p-10 shadow-xl flex items-center justify-center min-h-[520px] relative overflow-hidden">
                <div 
                  className="w-full max-w-[360px] aspect-[1/1.4] bg-slate-50 border border-gray-250 shadow-md rounded-lg p-6 relative flex flex-col justify-between align-stretch font-serif overflow-hidden"
                >
                  
                  {/* Dummy Lines */}
                  <div className="flex flex-col gap-2.5 opacity-30 pointer-events-none">
                    <div className="w-24 h-3 bg-slate-900 rounded-xs mb-3"></div>
                    <div className="w-full h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-full h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-5/6 h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-full h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-5/6 h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-full h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-4/5 h-1 bg-slate-700 rounded-xs"></div>
                  </div>

                  <div className="flex flex-col gap-2.5 opacity-30 mt-6 pointer-events-none">
                    <div className="w-full h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-5/6 h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-full h-1 bg-slate-700 rounded-xs"></div>
                    <div className="w-4/5 h-1 bg-slate-700 rounded-xs"></div>
                  </div>

                  {/* Absolute watermark preview elements */}
                  {position === 'repeat' ? (
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-3 p-4 gap-4 overflow-hidden z-20">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-center text-center select-none"
                          style={{ opacity: opacity / 100 }}
                        >
                          {watermarkType === 'text' ? (
                            <span 
                              className="font-bold tracking-wider pointer-events-none"
                              style={{ 
                                color: textColor, 
                                fontSize: `${fontSize * 0.4}px`,
                                transform: `rotate(${rotationAngle}deg)`
                              }}
                            >
                              {watermarkText || 'STAMP'}
                            </span>
                          ) : (
                            imageFile ? (
                              <img src={imageFile} className="max-h-8 object-contain" />
                            ) : (
                              <span className="text-[8px] font-sans text-teal-600 font-bold border border-teal-200 px-1 py-0.5 rounded">LOGO_TILES</span>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Centered single watermark alignment overlay */
                    <div 
                      className={`absolute pointer-events-none z-20 select-none flex items-center justify-center p-2 text-center transition-all duration-100 ${
                        position === 'center' ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2' :
                        position === 'top-left' ? 'left-4 top-4' :
                        position === 'top-right' ? 'right-4 top-4' :
                        position === 'bottom-left' ? 'left-4 bottom-4' :
                        'right-4 bottom-4' // bottom-right
                      }`}
                      style={{ opacity: opacity / 100 }}
                    >
                      {watermarkType === 'text' ? (
                        <span 
                          className="font-black tracking-widest break-normal whitespace-nowrap uppercase"
                          style={{ 
                            color: textColor, 
                            fontSize: `${fontSize * 0.45}px`, 
                            transform: `rotate(${rotationAngle}deg)` 
                          }}
                        >
                          {watermarkText || 'STAMP'}
                        </span>
                      ) : (
                        imageFile ? (
                          <img 
                            src={imageFile} 
                            style={{ 
                              width: `${75 * (imageScale / 100)}px`,
                              maxHeight: '100px',
                              objectFit: 'contain'
                            }} 
                            alt="Logo Watermark" 
                          />
                        ) : (
                          <span className="text-xs font-bold text-teal-600 border border-teal-300 bg-teal-50 px-2 py-1 rounded-md uppercase">
                            Watermark Logo
                          </span>
                        )
                      )}
                    </div>
                  )}

                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-400 uppercase tracking-widest pointer-events-none select-none">
                    Preview Page Layout
                  </div>

                </div>
              </div>

              {/* Informative tips box */}
              <div className="mt-4 p-3 bg-teal-50 rounded-xl text-[11px] text-teal-900 border border-teal-150 flex items-start gap-2.5 max-w-lg">
                <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Did you know?</strong> Stamping can be done in <strong>"Repeat Tiled Overlay Grid"</strong> mode to protect every square inch of your intellectual material across the entire document canvas.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
