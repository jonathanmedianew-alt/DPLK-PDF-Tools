import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import confetti from 'canvas-confetti';
import { 
  FileText, ArrowLeft, PenTool, Edit3, Trash2, 
  Upload, Download, Sparkles, User, Users, Mail, 
  ChevronRight, Calendar, AlertCircle, RefreshCw, Check,
  Sliders, Info, Type, Image as ImageIcon, CheckCircle2
} from 'lucide-react';

interface SignToolProps {
  onBack: () => void;
}

interface SignatoryRequest {
  id: string;
  email: string;
  name: string;
  role: 'Signer' | 'Approver' | 'Viewer';
  status: 'Pending' | 'Signed' | 'Sent';
}

export default function SignTool({ onBack }: SignToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [fileSize, setFileSize] = useState<string>('');
  
  // Workflows
  const [signMethod, setSignMethod] = useState<'yourself' | 'request'>('yourself');
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('draw');
  
  // Canvas states
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState('Jonathan M.');
  const [typedFont, setTypedFont] = useState<'Georgia' | 'Caveat' | 'Brush' | 'Allura'>('Caveat');
  const [sigColor, setSigColor] = useState('#1e3a8a'); // Navy Blue
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  // Signature placement settings
  const [targetPages, setTargetPages] = useState<'all' | 'first' | 'last' | 'custom'>('all');
  const [customPagesInput, setCustomPagesInput] = useState('1');
  const [positionPreset, setPositionPreset] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'center' | 'custom'>('bottom-right');
  const [posX, setPosX] = useState(75); // percent
  const [posY, setPosY] = useState(15); // percent (from bottom)
  const [sigScale, setSigScale] = useState(100);
  
  // Requests states
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientRole, setRecipientRole] = useState<'Signer' | 'Approver'>('Signer');
  const [subject, setSubject] = useState('Please sign: Documents package');
  const [customMessage, setCustomMessage] = useState('Hello, please review and place your electronic signature here. Thanks!');
  const [requestsList, setRequestsList] = useState<SignatoryRequest[]>([
    { id: '1', email: 'janice.green@dplk-engineering.com', name: 'Janice Green', role: 'Signer', status: 'Pending' },
    { id: '2', email: 'alex.carter@dplk-dev.org', name: 'Alex Carter', role: 'Approver', status: 'Sent' }
  ]);

  // General processing loaders
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedBlobUrl, setSignedBlobUrl] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // File drag & drop handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    processSelectedFile(e.target.files[0]);
  };

  const processSelectedFile = async (selected: File) => {
    if (selected.type !== 'application/pdf') {
      setError('Only standard PDF files are supported.');
      return;
    }
    setError(null);
    setSignedBlobUrl(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      const buffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pagesCount = pdfDoc.getPageCount();
      
      setFile(selected);
      setTotalPages(pagesCount);
      setFileSize((selected.size / (1024 * 1024)).toFixed(2) + ' MB');
    } catch (err: any) {
      console.error(err);
      setError('Could not parse target PDF file. It might be password-protected or encrypted.');
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
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  // Drawing signature pad engine
  useEffect(() => {
    if (signatureType === 'draw' && sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = sigColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signatureType, sigColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    // Support touch events
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignatureCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Import signature graphic
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileSelected = e.target.files?.[0];
    if (!fileSelected) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setScannedImage(event.target?.result as string);
    };
    reader.readAsDataURL(fileSelected);
  };

  // Apply Positioning Preset multipliers
  useEffect(() => {
    if (positionPreset === 'bottom-right') {
      setPosX(75);
      setPosY(8);
    } else if (positionPreset === 'bottom-left') {
      setPosX(10);
      setPosY(8);
    } else if (positionPreset === 'top-right') {
      setPosX(75);
      setPosY(82);
    } else if (positionPreset === 'center') {
      setPosX(42);
      setPosY(45);
    }
  }, [positionPreset]);

  // Compile typed signature info into a canvas base64 image
  const getTypedSignatureBase64 = (): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 120;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';

    // Paint white or transparent back
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

    ctx.font = typedFont === 'Caveat' ? 'italic 42px "Caveat", cursive, sans-serif'
             : typedFont === 'Georgia' ? 'italic bold 34px "Georgia", serif'
             : typedFont === 'Brush' ? 'bold italic 38px "Courier New", monospace'
             : 'italic 36px "Times New Roman", Times, serif';
             
    ctx.fillStyle = sigColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, 200, 60);

    // Dynamic clean line underneath
    ctx.strokeStyle = sigColor + '66'; // transparent
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 95);
    ctx.lineTo(360, 95);
    ctx.stroke();

    return tempCanvas.toDataURL('image/png');
  };

  // Compile Canvas drawings to PNG base64
  const getSignatureDataUrl = (): string => {
    if (signatureType === 'draw' && sigCanvasRef.current) {
      // Return canvas
      return sigCanvasRef.current.toDataURL('image/png');
    } else if (signatureType === 'type') {
      return getTypedSignatureBase64();
    } else if (signatureType === 'upload' && scannedImage) {
      return scannedImage;
    }
    return '';
  };

  // Request digital signature layout logic
  const addSignatoryRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !recipientName) return;

    const newRequest: SignatoryRequest = {
      id: Date.now().toString(),
      email: recipientEmail,
      name: recipientName,
      role: recipientRole as any,
      status: 'Sent'
    };

    setRequestsList((prev) => [newRequest, ...prev]);
    setRecipientName('');
    setRecipientEmail('');
    setSuccessMsg(`Sent electronic signature invitation code to ${recipientEmail}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // PDF Compilation & embedding pipeline using pdf-lib!
  const compileSignedPdf = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);
    setSignedBlobUrl(null);

    const sigDataUrl = getSignatureDataUrl();
    if (!sigDataUrl || sigDataUrl === 'data:,') {
      setError('Please produce a valid signature drawing, type, or asset first.');
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Fetch file as array-buffer
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      
      // 2. Embed the transparent Signature image
      // Remove data header for embedding safely
      const rawPngBytes = await fetch(sigDataUrl).then(res => res.arrayBuffer());
      const embeddedSig = await pdfDoc.embedPng(rawPngBytes);

      // 3. Compute target page indices
      const pageCount = pdfDoc.getPageCount();
      const targetIndices: number[] = [];

      if (targetPages === 'all') {
        for (let i = 0; i < pageCount; i++) targetIndices.push(i);
      } else if (targetPages === 'first') {
        targetIndices.push(0);
      } else if (targetPages === 'last') {
        targetIndices.push(pageCount - 1);
      } else {
        // Custom parsed indices
        const customParts = customPagesInput.split(',').map(s => parseInt(s.trim(), 10));
        customParts.forEach(val => {
          if (!isNaN(val) && val >= 1 && val <= pageCount) {
            targetIndices.push(val - 1); // 0-indexed internal pdf-lib page index
          }
        });
      }

      // Check boundary coordinates
      if (targetIndices.length === 0) {
        throw new Error('No valid output target pages found. Ensure page numbers are correct.');
      }

      // 4. Position and stamp elements
      targetIndices.forEach((pageIdx) => {
        const page = pdfDoc.getPage(pageIdx);
        const { width, height } = page.getSize();

        // Convert percentage relative positions
        const normWidth = embeddedSig.width * (sigScale / 100) * 0.4;
        const normHeight = embeddedSig.height * (sigScale / 100) * 0.4;
        
        const normX = (posX / 100) * width;
        const normY = (posY / 100) * height;

        page.drawImage(embeddedSig, {
          x: normX,
          y: normY,
          width: normWidth,
          height: normHeight,
        });
      });

      // 5. Build signed sequence
      const modifiedPdfBytes = await pdfDoc.save();
      const processedBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const processedUrl = URL.createObjectURL(processedBlob);
      
      setSignedBlobUrl(processedUrl);
      setSuccessMsg(`Successfully embedded signature on ${targetIndices.length} page(s)!`);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error(err);
      setError('Stamping Pipeline Error: ' + (err.message || 'Error occurred while saving signature layers.'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-50/50 min-h-screen pb-16" id="sig-tool-root">
      
      {/* Mini Title Jumbotron Navigation strip */}
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
              <div className="bg-violet-600 p-1.5 rounded-lg">
                <PenTool className="h-4 w-4 text-white" />
              </div>
              <h1 className="font-sans font-bold text-sm sm:text-base tracking-tight text-white">
                Sign PDF Document
              </h1>
            </div>
          </div>
          <div className="text-[10px] font-mono text-violet-300 bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
            DPLK Secure E-Sign Engine v1.5 (100% Client-Side)
          </div>
        </div>
      </div>

      {/* Primary Container View */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        
        {/* Step 1: File selection viewport */}
        {!file ? (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 hover:border-violet-500 rounded-2xl p-12 bg-white text-center cursor-pointer transition shadow-xs max-w-2xl mx-auto"
            onClick={() => document.getElementById('signer-file-picker')?.click()}
          >
            <div className="h-16 w-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-violet-600">
              <Upload className="h-8 w-8 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Select PDF file to Sign
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
              Drag and drop your PDF document here, or choose a file from your computer local folders
            </p>
            <button
              type="button"
              className="p-2 px-6 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-violet-600/15"
            >
              Choose PDF Document
            </button>
            <input
              id="signer-file-picker"
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
          /* Step 2: Workspace View (Sidebar controls with center page canvas) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Controls Workspace Panel */}
            <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <h4 className="font-bold text-xs text-gray-900 max-w-[180px] truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-[10px] text-gray-400">
                      {totalPages} pages • {fileSize}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition text-[10px] font-bold flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Workflow mode switches */}
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setSignMethod('yourself'); setSuccessMsg(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                    signMethod === 'yourself' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Sign documents yourself</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSignMethod('request'); setSuccessMsg(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
                    signMethod === 'request' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Request signatures</span>
                </button>
              </div>

              {/* WORKFLOW A: Sign Yourself Panel control elements */}
              {signMethod === 'yourself' ? (
                <div className="flex flex-col gap-4">
                  
                  {/* Signature Formats drawer switcher */}
                  <div>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      1. Choose Signature Method
                    </span>
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {[
                        { id: 'draw', label: 'Draw Pad', icon: PenTool },
                        { id: 'type', label: 'Type Styled', icon: Type },
                        { id: 'upload', label: 'Upload PNG', icon: ImageIcon }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSignatureType(item.id as any)}
                          className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            signatureType === item.id 
                              ? 'bg-violet-50 text-violet-700 border-b-2 border-violet-600' 
                              : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SUB-FORMAT 1: Draw Board Canvas */}
                  {signatureType === 'draw' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-semibold">Draw inside the signature line:</span>
                        <button
                          type="button"
                          onClick={clearSignatureCanvas}
                          className="text-[10px] text-violet-600 hover:underline font-bold"
                        >
                          Clear Drawing Pad
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded-xl relative overflow-hidden bg-slate-50 cursor-crosshair">
                        <canvas
                          ref={sigCanvasRef}
                          width={400}
                          height={120}
                          className="w-full h-[120px] block"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />
                        <div className="absolute bottom-5 left-8 right-8 border-b border-dashed border-gray-400/80 pointer-events-none text-center">
                          <span className="text-[9px] font-mono text-gray-400 uppercase">e-Signature Bounds</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-FORMAT 2: Typing Name Form */}
                  {signatureType === 'type' && (
                    <div className="flex flex-col gap-3.5">
                      <div>
                        <label className="text-xs text-gray-600 font-bold block mb-1">Enter your full name:</label>
                        <input
                          type="text"
                          value={typedName}
                          onChange={(e) => setTypedName(e.target.value)}
                          placeholder="Your signing name"
                          maxLength={32}
                          className="w-full bg-white border border-gray-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg p-2 text-xs focus:outline-none transition"
                        />
                      </div>

                      {/* Font selector choice */}
                      <div>
                        <span className="text-xs text-gray-600 font-bold block mb-1">Select signature typography font:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'Caveat', label: 'Cursive Caveat', style: "font-serif italic text-base" },
                            { id: 'Georgia', label: 'Times Georgia', style: "font-serif text-sm font-semibold italic" },
                            { id: 'Brush', label: 'Modern Clean', style: "font-sans text-xs italic tracking-wider" },
                            { id: 'Allura', label: 'Calligraphy Classic', style: "font-serif text-sm italic" }
                          ].map((fItem) => (
                            <button
                              key={fItem.id}
                              type="button"
                              onClick={() => setTypedFont(fItem.id as any)}
                              className={`p-2 rounded-lg border text-left transition ${
                                typedFont === fItem.id 
                                  ? 'border-violet-500 bg-violet-50/50 text-violet-700 font-bold' 
                                  : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                              }`}
                            >
                              <div className={fItem.style}>{typedName || 'Signature'}</div>
                              <span className="text-[9px] text-gray-400 block mt-1">{fItem.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-FORMAT 3: PNG signature image uploader */}
                  {signatureType === 'upload' && (
                    <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50 text-center">
                      {scannedImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <img src={scannedImage} className="max-h-20 object-contain rounded border bg-white p-1" />
                          <button
                            type="button"
                            onClick={() => setScannedImage(null)}
                            className="text-[10px] text-red-600 hover:underline font-bold"
                          >
                            Remove signature image
                          </button>
                        </div>
                      ) : (
                        <div className="cursor-pointer" onClick={() => document.getElementById('signature-png-picker')?.click()}>
                          <ImageIcon className="h-6 w-6 text-gray-400 mx-auto mb-1.5" />
                          <p className="text-xs text-slate-600 font-bold">Import direct signature file</p>
                          <p className="text-[10px] text-gray-400 mt-1">Supports JPEG, PNG with transparent background</p>
                          <input
                            id="signature-png-picker"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Formatting parameters panel: Colors */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3.5">
                    <span className="text-xs text-gray-600 font-bold">Signature Ink Color:</span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#1e3a8a', label: 'Navy' },
                        { color: '#1e293b', label: 'Charcoal' },
                        { color: '#dc2626', label: 'Crimson' },
                        { color: '#16a34a', label: 'Emerald' }
                      ].map((cItem) => (
                        <button
                          key={cItem.color}
                          type="button"
                          onClick={() => setSigColor(cItem.color)}
                          className={`w-5 h-5 rounded-full border border-white focus:outline-none transition ${
                            sigColor === cItem.color ? 'ring-2 ring-violet-500 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: cItem.color }}
                          title={cItem.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 2. Choose pages bounds layout */}
                  <div className="border-t border-gray-100 pt-3.5 flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      2. Configure Signature Position
                    </span>

                    <div className="grid grid-cols-2 gap-2 pb-2">
                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Target Pages:</label>
                        <select
                          value={targetPages}
                          onChange={(e) => setTargetPages(e.target.value as any)}
                          className="bg-white border border-gray-200 rounded-lg p-1.5 w-full text-xs focus:outline-none"
                        >
                          <option value="all">Sign All Pages</option>
                          <option value="first">First Page Only</option>
                          <option value="last">Last Page Only</option>
                          <option value="custom">Custom Page List</option>
                        </select>
                      </div>

                      {targetPages === 'custom' && (
                        <div>
                          <label className="text-[11px] text-gray-600 font-semibold block mb-1">Enter Pages:</label>
                          <input
                            type="text"
                            placeholder="e.g. 1, 3, 5"
                            value={customPagesInput}
                            onChange={(e) => setCustomPagesInput(e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg p-1.5 w-full text-xs focus:outline-none focus:border-violet-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100/60 pt-2 grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] text-gray-500 font-medium block">Position Preset:</label>
                        <select
                          value={positionPreset}
                          onChange={(e) => setPositionPreset(e.target.value as any)}
                          className="bg-white border border-gray-200 rounded-lg p-1 text-xs w-full focus:outline-none"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="center">Center / Focal</option>
                          <option value="custom">Custom Position Sliders</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-gray-500 font-medium block mb-1">Scale Scale ({sigScale}%):</label>
                        <input
                          type="range"
                          min={50}
                          max={180}
                          value={sigScale}
                          onChange={(e) => setSigScale(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        />
                      </div>
                    </div>

                    {positionPreset === 'custom' && (
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-200 text-xs flex flex-col gap-2 animate-fade-in">
                        <div>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                            <span>Alignment Horizontal (X):</span>
                            <span>{posX}%</span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={95}
                            value={posX}
                            onChange={(e) => setPosX(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                            <span>Alignment Vertical (Y from bottom):</span>
                            <span>{posY}%</span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={95}
                            value={posY}
                            onChange={(e) => setPosY(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stamp compile action buttons drawer */}
                  <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
                    
                    {error && (
                      <div className="p-3 bg-red-50 rounded-lg text-red-700 text-xs border border-red-150 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {successMsg && (
                      <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 text-xs border border-emerald-150 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {!signedBlobUrl ? (
                      <button
                        type="button"
                        onClick={compileSignedPdf}
                        disabled={isProcessing}
                        className="w-full p-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-violet-600/15 disabled:bg-violet-400"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            <span>Embedding signature layers...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Sign Document & Save Changes</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <a
                          href={signedBlobUrl}
                          download={`Signed_${file.name}`}
                          className="flex-1 p-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs transition text-center flex items-center justify-center gap-2 shadow-md shadow-violet-600/15"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Signed PDF</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => { setSignedBlobUrl(null); setSuccessMsg(null); }}
                          className="p-2.5 border border-gray-200 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition"
                          title="Sign Another File or Page"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* WORKFLOW B: Request signature team form module */
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl text-xs">
                    <p className="text-gray-500 leading-relaxed font-sans">
                      Prepare a request package to invite others to review and place their signature securely on this PDF document.
                    </p>
                  </div>

                  <form onSubmit={addSignatoryRequest} className="flex flex-col gap-3">
                    <div>
                      <label className="text-xs text-gray-600 font-bold block mb-1">Recipient Name:</label>
                      <input
                        type="text"
                        placeholder="e.g. Janice Green"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        required
                        className="w-full bg-white border border-gray-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg p-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 font-bold block mb-1">Recipient Email:</label>
                      <input
                        type="email"
                        placeholder="janice@company.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        required
                        className="w-full bg-white border border-gray-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-lg p-2 text-xs focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-600 font-semibold block mb-1">Action Type:</label>
                        <select
                          value={recipientRole}
                          onChange={(e) => setRecipientRole(e.target.value as any)}
                          className="bg-white border border-gray-200 rounded-lg p-1.5 w-full text-xs focus:outline-none"
                        >
                          <option value="Signer">Needs to Sign</option>
                          <option value="Approver">Approve Layout</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="submit"
                          className="w-full p-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Send Invitation</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="border-t border-gray-100 pt-3.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                      Requests History Queue ({requestsList.length})
                    </span>

                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                      {requestsList.map((reqItem) => (
                        <div key={reqItem.id} className="p-2 bg-white border border-gray-200 rounded-lg flex items-center justify-between text-xs font-sans">
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{reqItem.name}</span>
                              <span className="text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-500 font-normal">
                                {reqItem.role}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 leading-none">{reqItem.email}</div>
                          </div>
                          
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            reqItem.status === 'Signed' ? 'bg-emerald-50 text-emerald-700' :
                            reqItem.status === 'Sent' ? 'bg-indigo-50 text-indigo-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {reqItem.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>


            {/* RIGHT COLUMN: Realtime Live Visual Preview Panel of placement */}
            <div className="lg:col-span-7 flex flex-col items-center">
              
              {/* Paper Preview visual board header */}
              <div className="w-full bg-slate-200/90 border border-slate-300 rounded-t-2xl p-2 px-4 flex items-center justify-between text-[11px] text-gray-500 print:hidden font-sans">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="font-bold">Live signature placement map</span>
                </div>
                <span>Targeting: Page {targetPages === 'custom' ? customPagesInput : targetPages === 'all' ? '1 to ' + totalPages : targetPages === 'first' ? '1' : totalPages}</span>
              </div>

              {/* Simulated Paper sheet canvas for stamp visualization */}
              <div className="w-full bg-white border border-slate-300 rounded-b-2xl p-6 sm:p-10 shadow-xl flex items-center justify-center min-h-[520px] relative overflow-hidden">
                <div 
                  className="w-full max-w-[360px] aspect-[1/1.4] bg-slate-50 border border-gray-200 shadow-md rounded-lg p-6 relative flex flex-col justify-between align-stretch font-serif"
                  style={{ wordBreak: 'break-word' }}
                >
                  
                  {/* Decorative lines inside the dummy paper preview to feel premium and authentic */}
                  <div className="flex flex-col gap-2.5 opacity-40">
                    <div className="w-32 h-3.5 bg-slate-900 rounded-xs mb-3"></div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-xs"></div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-xs"></div>
                    <div className="w-5/6 h-1.5 bg-slate-700 rounded-xs"></div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-xs"></div>
                    <div className="w-5/6 h-1.5 bg-slate-700 rounded-xs"></div>

                    <div className="w-32 h-2.5 bg-slate-500 rounded-xs mt-4 mb-1"></div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-xs"></div>
                    <div className="w-4/5 h-1.5 bg-slate-700 rounded-xs"></div>
                  </div>

                  <div className="flex flex-col gap-2.5 opacity-40 mt-8">
                    <div className="w-24 h-2 bg-slate-500 rounded-xs"></div>
                    <div className="w-full h-1.5 bg-slate-700 rounded-xs flex gap-2">
                      <div className="w-1/3 bg-slate-700 h-1.5 rounded-xs"></div>
                      <div className="w-1/3 bg-slate-700 h-1.5 rounded-xs"></div>
                    </div>
                  </div>

                  {/* Absolute visual preview anchor representing signature stamp position overlay */}
                  <div 
                    className="absolute border border-dashed border-violet-400 bg-violet-50/10 p-1 pointer-events-none transition-all duration-100 flex flex-col items-center justify-center text-center"
                    style={{
                      left: `${posX}%`,
                      // Invert Y direction since pdf-lib coordinates are bottom-up and preview is top-down
                      bottom: `${posY}%`,
                      width: `${110 * (sigScale / 100)}px`,
                      height: `${42 * (sigScale / 100)}px`,
                    }}
                  >
                    
                    {/* Render visual preview based on signature state */}
                    {signatureType === 'draw' && (
                      <span className="text-[10px] font-mono text-violet-600 font-bold tracking-tight truncate border-b border-violet-400/30 w-full px-1">
                        ✍️ Drawn Signature
                      </span>
                    )}

                    {signatureType === 'type' && (
                      <span 
                        className={`text-slate-800 text-sm overflow-hidden truncate px-1 max-w-full`}
                        style={{ 
                          color: sigColor, 
                          fontFamily: typedFont === 'Caveat' ? 'Caveat' : typedFont === 'Georgia' ? 'Georgia' : 'sans-serif' 
                        }}
                      >
                        {typedName || 'Sign Name'}
                      </span>
                    )}

                    {signatureType === 'upload' && (
                      <span className="text-[9px] font-sans text-violet-600 font-semibold truncate">
                        🖼️ Image Asset
                      </span>
                    )}

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 bg-violet-600/10 text-[8px] font-bold text-violet-800 uppercase px-1 rounded">
                      Overlay
                    </div>
                  </div>

                  {/* Page index indicator absolute overlay */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-gray-450 uppercase tracking-widest pointer-events-none">
                    Preview Page Layout
                  </div>
                </div>
              </div>

              {/* Position adjustment tip info block */}
              <div className="mt-4 p-3 bg-indigo-50 rounded-xl text-[11px] text-indigo-900 border border-indigo-150 flex items-start gap-2.5 max-w-lg">
                <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Layout tip:</strong> Switch position preset to <strong>"Custom Position Sliders"</strong> inside the left dashboard panel for layout-perfect custom alignments on your document sheets.
                </p>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}
