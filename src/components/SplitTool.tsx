import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { 
  Scissors, FileText, CheckCircle, RefreshCw, 
  Download, Plus, Settings, CheckSquare, Layers 
} from 'lucide-react';

interface SplitToolProps {
  onBack: () => void;
}

interface ExtractedFile {
  name: string;
  blobUrl: string;
  pagesDescription: string;
}

export default function SplitTool({ onBack }: SplitToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  
  const [splitMode, setSplitMode] = useState<'range' | 'individual'>('range');
  const [customRange, setCustomRange] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedFiles, setExtractedFiles] = useState<ExtractedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setError(null);
    setExtractedFiles([]);
    const selectedFile = e.target.files[0];
    
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    
    setFile(selectedFile);
    setFileSize(selectedFile.size);
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const count = pdfDoc.getPageCount();
      setTotalPages(count);
      
      // Initialize selected pages (all selected by default)
      const pagesArray = Array.from({ length: count }, (_, i) => i + 1);
      setSelectedPages(pagesArray);
      setCustomRange(`1-${count}`);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to read PDF pages: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    setExtractedFiles([]);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    
    if (droppedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    
    setFile(droppedFile);
    setFileSize(droppedFile.size);
    
    const readPdf = async () => {
      try {
        const arrayBuffer = await droppedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const count = pdfDoc.getPageCount();
        setTotalPages(count);
        
        const pagesArray = Array.from({ length: count }, (_, i) => i + 1);
        setSelectedPages(pagesArray);
        setCustomRange(`1-${count}`);
      } catch (err: any) {
        setError(`Failed to parse PDF pages: ${err?.message || 'Unknown error'}`);
      }
    };
    readPdf();
  };

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages((prev) => 
      prev.includes(pageNumber)
        ? prev.filter((p) => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b)
    );
  };

  const selectAllPages = () => {
    if (!totalPages) return;
    setSelectedPages(Array.from({ length: totalPages }, (_, i) => i + 1));
  };

  const clearAllPages = () => {
    setSelectedPages([]);
  };

  const parseRanges = (rangeStr: string, maxPage: number): number[] => {
    const pages = new Set<number>();
    const components = rangeStr.split(',');
    
    for (const comp of components) {
      const trimmed = comp.trim();
      if (!trimmed) continue;
      
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr.trim(), 10);
        const end = parseInt(endStr.trim(), 10);
        
        if (!isNaN(start) && !isNaN(end)) {
          const lower = Math.max(1, Math.min(start, maxPage));
          const upper = Math.max(1, Math.min(end, maxPage));
          const step = lower <= upper ? 1 : -1;
          for (let p = lower; ; p += step) {
            pages.add(p);
            if (p === upper) break;
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= maxPage) {
          pages.add(p);
        }
      }
    }
    
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleSplit = async () => {
    if (!file || !totalPages) return;
    setIsProcessing(true);
    setError(null);
    setExtractedFiles([]);
    
    try {
      const originalBytes = await file.arrayBuffer();
      const originPdf = await PDFDocument.load(originalBytes);
      const results: ExtractedFile[] = [];
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      
      if (splitMode === 'range') {
        const pagesToExtract = parseRanges(customRange, totalPages);
        if (pagesToExtract.length === 0) {
          throw new Error('Please enter a valid page range (e.g. 1-3, 5).');
        }
        
        const splitPdf = await PDFDocument.create();
        // PDFDocument page indices are 0-based
        const targetIndices = pagesToExtract.map((p) => p - 1);
        const copiedPages = await splitPdf.copyPages(originPdf, targetIndices);
        copiedPages.forEach((page) => splitPdf.addPage(page));
        
        const bytes = await splitPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        
        results.push({
          name: `${baseName}_range_${customRange.replace(/\s+/g, '')}.pdf`,
          blobUrl: URL.createObjectURL(blob),
          pagesDescription: `Pages: ${pagesToExtract.join(', ')}`
        });
      } else {
        // Individual selected pages mode
        if (selectedPages.length === 0) {
          throw new Error('Please select at least one page to extract.');
        }
        
        for (const pageNum of selectedPages) {
          const splitPdf = await PDFDocument.create();
          const copiedPages = await splitPdf.copyPages(originPdf, [pageNum - 1]);
          splitPdf.addPage(copiedPages[0]);
          
          const bytes = await splitPdf.save();
          const blob = new Blob([bytes], { type: 'application/pdf' });
          
          results.push({
            name: `${baseName}_page_${pageNum}.pdf`,
            blobUrl: URL.createObjectURL(blob),
            pagesDescription: `Page ${pageNum}`
          });
        }
      }
      
      setExtractedFiles(results);
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to split PDF documents.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8" id="split-tool-view">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button 
            type="button" 
            onClick={onBack}
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition flex items-center gap-2 mb-2"
          >
            ← Back to Tools
          </button>
          <h1 className="text-3xl font-sans font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Scissors className="h-8 w-8 text-indigo-500" />
            Split PDF
          </h1>
          <p className="text-gray-500 text-sm mt-1">Extract specific page sets or split all pages into separate files.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-900 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {!file ? (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 hover:bg-gray-50 hover:border-indigo-400 transition-all p-12 text-center flex flex-col items-center justify-center min-h-[350px]"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-500 shadow-sm">
            <Scissors className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Drag and drop PDF file here</h3>
          <p className="text-gray-500 text-sm max-w-sm mb-6">Select a single multi-page PDF document to split into segments.</p>
          
          <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-3 px-6 rounded-xl shadow-sm transition inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Select PDF File
            <input 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-6">
                <div className="bg-indigo-50 text-indigo-600 h-10 w-10 flex items-center justify-center rounded-xl shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{file.name}</h4>
                  <p className="text-xs text-gray-500">{formatSize(fileSize)} • {totalPages} pages</p>
                </div>
              </div>

              {/* PDF splitting control selection tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('range');
                    setExtractedFiles([]);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition ${
                    splitMode === 'range' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Split by Page Ranges
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('individual');
                    setExtractedFiles([]);
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition ${
                    splitMode === 'individual' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Select Individual Pages
                </button>
              </div>

              {splitMode === 'range' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      Page Range Rules
                    </label>
                    <input
                      type="text"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      placeholder="e.g. 1-3, 5, 8-12"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Use comma for separate ranges and hyphen for continuous page batches. Max Page: {totalPages}.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                    <span className="text-xs text-gray-600 font-medium">
                      Selected: {selectedPages.length} of {totalPages} pages
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllPages}
                        className="text-indigo-600 hover:text-indigo-700 text-xs font-bold"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearAllPages}
                        className="text-gray-500 hover:text-gray-700 text-xs font-semibold"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto p-1 border border-gray-100 rounded-xl">
                    {Array.from({ length: totalPages || 0 }, (_, i) => i + 1).map((pg) => {
                      const isSelected = selectedPages.includes(pg);
                      return (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => togglePageSelection(pg)}
                          className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 transition ${
                            isSelected 
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20' 
                              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-[10px] text-gray-400 font-medium">PAGE</span>
                          <span className="text-base font-bold">{pg}</span>
                          <CheckSquare className={`h-3 w-3 mt-1.5 ${isSelected ? 'text-indigo-600 opacity-100' : 'opacity-0'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Box panel */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm self-start space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Split Settings</h3>
              <p className="text-xs text-gray-500">Extract matching content immediately in real-time.</p>
            </div>

            {extractedFiles.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-emerald-800">Split complete!</h5>
                    <p className="text-[10px] text-emerald-600">Generated {extractedFiles.length} file(s).</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {extractedFiles.map((extFile, ix) => (
                    <div key={ix} className="border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs bg-gray-50/50">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate" title={extFile.name}>
                          {extFile.name}
                        </p>
                        <p className="text-[10px] text-gray-500">{extFile.pagesDescription}</p>
                      </div>
                      <a
                        href={extFile.blobUrl}
                        download={extFile.name}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-lg transition text-xs shrink-0 flex items-center gap-1 font-bold shadow-xs px-2.5"
                      >
                        <Download className="h-3 w-3" /> Save
                      </a>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setExtractedFiles([]);
                  }}
                  className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition"
                >
                  <RefreshCw className="h-3 w-3" /> Start a New Split
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessing || (splitMode === 'individual' && selectedPages.length === 0)}
                onClick={handleSplit}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-medium shadow-md transition flex items-center justify-center gap-2 ${
                  isProcessing || (splitMode === 'individual' && selectedPages.length === 0)
                    ? 'bg-indigo-400 cursor-not-allowed opacity-85'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Extracting PDF pages...
                  </>
                ) : (
                  <>
                    <Scissors className="h-5 w-5" />
                    Split and Extract PDF
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
