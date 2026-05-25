import React, { useState } from 'react';
import { UploadedFile } from '../types';
import { PDFDocument } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { 
  FileText, ArrowUp, ArrowDown, Trash2, Plus, 
  Sparkles, Layers, Download, CheckCircle, RefreshCw 
} from 'lucide-react';

interface MergeToolProps {
  onBack: () => void;
}

export default function MergeTool({ onBack }: MergeToolProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [mergedFileName, setMergedFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);
    const newFiles: UploadedFile[] = [];
    
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are supported.');
        continue;
      }
      
      try {
        // Load file info including page count
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const totalPages = pdfDoc.getPageCount();
        
        newFiles.push({
          id: `${Date.now()}-${i}-${file.name}`,
          file,
          name: file.name,
          size: file.size,
          totalPages,
          order: files.length + i,
        });
      } catch (err) {
        console.error(err);
        newFiles.push({
          id: `${Date.now()}-${i}-${file.name}`,
          file,
          name: file.name,
          size: file.size,
          totalPages: undefined,
          order: files.length + i,
        });
      }
    }
    
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    const pdfs = droppedFiles.filter(f => f.type === 'application/pdf');
    if (pdfs.length === 0) {
      setError('Please drop files containing only PDFs.');
      return;
    }
    
    // Convert to UploadedFile format...
    const loadFiles = async () => {
      const newFiles: UploadedFile[] = [];
      for (let i = 0; i < pdfs.length; i++) {
        const file = pdfs[i];
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const totalPages = pdfDoc.getPageCount();
          newFiles.push({
            id: `${Date.now()}-${i}`,
            file,
            name: file.name,
            size: file.size,
            totalPages,
            order: files.length + i,
          });
        } catch (err) {
          newFiles.push({
            id: `${Date.now()}-${i}`,
            file,
            name: file.name,
            size: file.size,
            order: files.length + i,
          });
        }
      }
      setFiles((prev) => [...prev, ...newFiles]);
    };
    loadFiles();
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (mergedBlobUrl) {
      URL.revokeObjectURL(mergedBlobUrl);
      setMergedBlobUrl(null);
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= files.length) return;
    
    const newFiles = [...files];
    const temp = newFiles[index];
    newFiles[index] = newFiles[targetIndex];
    newFiles[targetIndex] = temp;
    
    setFiles(newFiles);
    if (mergedBlobUrl) setMergedBlobUrl(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const uploaded of files) {
        const bytes = await uploaded.file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setMergedBlobUrl(url);
      setMergedFileName('merged_document.pdf');
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error(err);
      setError(`Failed to merge PDFs: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalPagesSum = files.reduce((sum, f) => sum + (f.totalPages || 0), 0);
  const totalSizeSum = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8" id="merge-tool-view">
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
            <Layers className="h-8 w-8 text-rose-500" />
            Merge PDF
          </h1>
          <p className="text-gray-500 text-sm mt-1">Combine multiple static PDF files into a single master document.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-900 font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Upload Zone */}
      {files.length === 0 ? (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 hover:bg-gray-50 hover:border-rose-400 transition-all p-12 text-center flex flex-col items-center justify-center min-h-[350px] relative pointer-events-auto"
        >
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 text-rose-500 shadow-sm">
            <Layers className="h-8 w-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Drag and drop PDF files here</h3>
          <p className="text-gray-500 text-sm max-w-sm mb-6">Or select multiple files from your computer to start merging them.</p>
          
          <label className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium py-3 px-6 rounded-xl shadow-sm transition inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Select PDF Files
            <input 
              type="file" 
              multiple 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFileChange} 
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reordering List / Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between bg-white px-2 py-1">
              <span className="text-sm font-medium text-gray-700">Sequence ({files.length} Files)</span>
              <label className="cursor-pointer text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add more files
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </label>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {files.map((file, idx) => (
                <div 
                  key={file.id} 
                  className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm hover:border-gray-300 transition duration-150"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="bg-red-50 text-red-600 h-10 w-10 shrink-0 flex items-center justify-center rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{file.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                        <span>{formatSize(file.size)}</span>
                        {file.totalPages && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{file.totalPages} pages</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      className={`p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      className={`p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition ${idx === files.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="p-1.5 rounded-lg border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Toolbar & Merge Actions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm self-start space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Merge Settings</h3>
              <p className="text-xs text-gray-500">Reorder files using arrow keys to adjust PDF stitch sequence.</p>
            </div>

            <div className="border-t border-b border-gray-100 py-4 space-y-3">
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>Total Files</span>
                <span className="text-gray-900">{files.length}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>Estimated Pages</span>
                <span className="text-gray-900">{totalPagesSum || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-gray-500">
                <span>Size Accumulation</span>
                <span className="text-gray-900">{formatSize(totalSizeSum)}</span>
              </div>
            </div>

            {mergedBlobUrl ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-800">Merge Completed successfully!</p>
                    <p className="text-[10px] text-emerald-600">Pure offline client-side compilation</p>
                  </div>
                </div>
                <a
                  href={mergedBlobUrl}
                  download={mergedFileName}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Download className="h-4 w-4" />
                  Download Combined PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setMergedBlobUrl(null);
                    setFiles([]);
                  }}
                  className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition"
                >
                  <RefreshCw className="h-3 w-3" />
                  Start a New Merge
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={files.length < 2 || isProcessing}
                onClick={handleMerge}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-medium shadow-md transition flex items-center justify-center gap-2 ${
                  files.length < 2 || isProcessing
                    ? 'bg-rose-400 cursor-not-allowed opacity-85'
                    : 'bg-rose-600 hover:bg-rose-700 hover:shadow-lg'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Stitching Documents...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Stitch & Merge PDF
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
