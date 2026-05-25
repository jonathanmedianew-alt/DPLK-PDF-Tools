import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Heading1, Heading2, Type, Bold, Italic, Underline, 
  Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Image as ImageIcon, Link as LinkIcon, 
  Undo2, Redo2, Table as TableIcon, Download, Upload, Trash2, 
  Sparkles, HelpCircle, ArrowLeft, Check, ZoomIn, ZoomOut, 
  Search, RefreshCw, Printer, Clock, Eye, AlertCircle, Quote
} from 'lucide-react';

interface WordEditorProps {
  onBack: () => void;
}

export default function WordEditor({ onBack }: WordEditorProps) {
  // Document state
  const [docTitle, setDocTitle] = useState('Untitled Document');
  const [activeTab, setActiveTab] = useState<'home' | 'insert' | 'layout' | 'templates'>('home');
  const [zoom, setZoom] = useState(100);
  const [margins, setMargins] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [showHelp, setShowHelp] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  
  // Document stats
  const [stats, setStats] = useState({
    words: 0,
    chars: 0,
    sentences: 0,
    paragraphs: 0,
    readingTime: 0
  });

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default templates library
  const templates = {
    minimal: {
      title: 'Blank Document',
      desc: 'Start with a clean word canvas',
      html: `<p><br></p>`
    },
    resume: {
      title: 'Professional Resume / CV',
      desc: 'Executive portfolio or CV skeleton',
      html: `
        <h1 style="text-align: center; color: #1e3a8a; font-family: 'Times New Roman'; margin-bottom: 2px;">JONATHAN MEDIANEW</h1>
        <p style="text-align: center; font-size: 14px; font-family: 'Georgia'; color: #4b5563; margin-top: 0px;">jonathanmedianew@gmail.com | +1 (555) 019-2834 | New York, NY</p>
        <hr style="border: none; border-top: 1px solid #1e3a8a; margin: 15px 0;" />
        
        <h2 style="color: #1e3a8a; font-family: 'Times New Roman'; margin-bottom: 5px;">PROFESSIONAL SUMMARY</h2>
        <p style="font-family: 'Georgia'; line-height: 1.5; font-size: 14px;">Highly motivated Full-Stack Software Engineer with 6+ years of specialized experience in crafting high-speed compilation pipelines, client-side browser modules, and interactive enterprise data visualization platforms. Proven capability in optimizing client processing systems and deploying cloud sandbox environments to support active engineering initiatives.</p>
        
        <h2 style="color: #1e3a8a; font-family: 'Times New Roman'; margin-top: 20px; margin-bottom: 5px;">PROFESSIONAL EXPERIENCE</h2>
        <p style="font-family: 'Georgia'; font-size: 14px; margin-bottom: 2px;"><strong>Senior Systems Developer</strong> @ DPLK Engineering Lab (2023 - Present)</p>
        <ul style="font-family: 'Georgia'; font-size: 14px; line-height: 1.5;">
          <li>Designed and optimized robust offline-first browser compiler mechanics, reducing file bundle parsing times by 42%.</li>
          <li>Led the deployment of visual layouts for document processing workspaces supporting dual PDF/Cell editing formats.</li>
          <li>Constructed custom sandboxed compilation frameworks to assure secure local processing of customer telemetry logs.</li>
        </ul>

        <p style="font-family: 'Georgia'; font-size: 14px; margin-bottom: 2px; margin-top: 15px;"><strong>Software Engineer</strong> @ Global Cloud Solutions (2020 - 2023)</p>
        <ul style="font-family: 'Georgia'; font-size: 14px; line-height: 1.5;">
          <li>Configured high-volume API brokers and microservice endpoints, handling over 14 million daily production payloads safely.</li>
          <li>Partnered with UX Architects to engineer desktop-first, responsive dashboard interfaces leveraging SVG layers and custom charts.</li>
        </ul>

        <h2 style="color: #1e3a8a; font-family: 'Times New Roman'; margin-top: 20px; margin-bottom: 5px;">TECHNICAL COMPETENCIES</h2>
        <p style="font-family: 'Georgia'; font-size: 14px; line-height: 1.5;">
          <strong>Languages & Databases:</strong> TypeScript, JavaScript, Python, PostgreSQL, SQL, Redis, GraphQL<br/>
          <strong>Frameworks & Libraries:</strong> React, Vite, Node.js, Express, Tailwind CSS, Recharts, D3.js, PDF-Lib<br/>
          <strong>Core Infrastructure:</strong> Docker, Git, Linux, Webpack, esbuild, Cloud Services Sandbox
        </p>
      `
    },
    proposal: {
      title: 'Business Project Proposal',
      desc: 'Formal client deliverable outline',
      html: `
        <h1 style="text-align: center; color: #0d9488; font-family: 'Arial'; margin-bottom: 5px;">PROJECT PROPOSAL: ENTERPRISE LEDGER</h1>
        <p style="text-align: center; font-size: 13px; font-family: 'Arial'; color: #6b7280;">DPLK Systems Optimization Initiative</p>
        <p style="text-align: center; font-family: 'Arial'; font-size: 12px; color: #9ca3af; margin-top: 2px;">Published: May 2026</p>
        <hr style="border: none; border-top: 2px solid #0d9488; margin: 20px 0;" />

        <h3 style="color: #0f766e; font-family: 'Arial';">1. EXECUTIVE OVERVIEW</h3>
        <p style="font-family: 'Arial'; line-height: 1.6; font-size: 14px; text-align: justify;">The objective of this initiative is to supply our technical stakeholders with an interactive, fully sandboxed web module to create, edit, draft, and modify document layouts directly in client browsers without external API queries. Eliminating data transit guarantees zero liability leaks while boosting productivity by maintaining lightning-fast performance benchmarks.</p>

        <h3 style="color: #0f766e; font-family: 'Arial'; margin-top: 20px;">2. PROPOSED PROJECT TIMELINE</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-family: 'Arial'; font-size: 13px;">
          <thead>
            <tr style="background-color: #f1f5f9; text-align: left;">
              <th style="border: 1px solid #cbd5e1; padding: 8px;">Phase</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px;">Actions Required</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Milestone Days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Phase 1</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Sandbox environment configuration</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">4 Days</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Phase 2</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Core Rich Text Formatting validation</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">5 Days</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Phase 3</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Integration of dynamic file-export engines</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">3 Days</td>
            </tr>
          </tbody>
        </table>

        <h3 style="color: #0f766e; font-family: 'Arial'; margin-top: 20px;">3. PRICING MODEL</h3>
        <p style="font-family: 'Arial'; line-height: 1.6; font-size: 14px;">Workforce resources are billed hourly at professional rates. Estimated aggregate expenditure values are itemized under the spreadsheet ledger modules inside the master dashboard pipeline.</p>
      `
    },
    meeting: {
      title: 'Formal Meeting Minutes',
      desc: 'Executive sprint or project catch-up',
      html: `
        <h2 style="color: #1e293b; font-family: 'Georgia'; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">DPLK WEEKLY SPRINT ALIGNMENT</h2>
        <p style="font-family: 'Georgia'; font-size: 13px; color: #475569; margin-top: 4px;"><strong>Date:</strong> May 25, 2026 | <strong>Time:</strong> 09:30 AM EST | <strong>Facilitator:</strong> Systems Team</p>
        
        <h3 style="color: #334155; font-family: 'Georgia'; margin-top: 15px;">Attendees List:</h3>
        <ul style="font-family: 'Georgia'; font-size: 14px; font-style: italic;">
          <li>Jonathan M. (Lead Systems Architecture)</li>
          <li>Alex Carter (Compiler Optimization Expert)</li>
          <li>Janice Green (Frontend UX Designer)</li>
        </ul>

        <h3 style="color: #334155; font-family: 'Georgia'; margin-top: 15px;">Key Discussion Highlights:</h3>
        <ol style="font-family: 'Georgia'; font-size: 14px; line-height: 1.6; margin-left: 20px;">
          <li><strong>Offline Frameworks:</strong> Jonathan confirmed that the local storage integration has successfully cleared regulatory safety reviews.</li>
          <li><strong>Editor Parity:</strong> Janice showcased the client interface, confirming WYSIWYG parity with modern, browser-based spreadsheets.</li>
          <li><strong>Rich Printing:</strong> Identified printer margin rules to ensure generated word processing tables export gracefully without page truncation overlays.</li>
        </ol>

        <div style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #64748b; margin-top: 20px; font-family: 'Georgia'; font-size: 13.5px;">
          <strong>Action Deliverable (High Importance):</strong> Janice has agreed to compile unit checks of text selection bounds before tomorrow's live pipeline test run.
        </div>
      `
    }
  };

  // Perform a blank editor start (by default, no template loaded, only a blank line)
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p><br></p>';
      handleStatsUpdate();
    }
  }, []);

  // Calculate character and word statistics based on HTML content innerText
  const handleStatsUpdate = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    
    // Calculate words
    const cleanText = text.trim();
    const wordsArr = cleanText ? cleanText.split(/\s+/) : [];
    const wordsCount = wordsArr.length;

    // Calculate characters without layout spaces
    const charsCount = text.length;

    // Calculate sentences
    const sentencesArr = cleanText ? cleanText.split(/[.!?]+/).filter(Boolean) : [];
    const sentencesCount = sentencesArr.length;

    // Calculate paragraphs
    const paragraphsCount = editorRef.current.querySelectorAll('p, h1, h2, h3, li, blockquote').length || 1;

    // Reading time at an average rate of 200 words-per-minute
    const minCalculated = Math.ceil(wordsCount / 200);

    setStats({
      words: wordsCount,
      chars: charsCount,
      sentences: sentencesCount,
      paragraphs: paragraphsCount,
      readingTime: minCalculated || 1
    });
  };

  // WYSIWYG command executive
  const execCmd = (cmd: string, value: string = '') => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    handleStatsUpdate();
  };

  // Heading selectors handler
  const handleHeaderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'p') {
      execCmd('formatBlock', 'p');
    } else if (val === 'h1') {
      execCmd('formatBlock', 'h1');
    } else if (val === 'h2') {
      execCmd('formatBlock', 'h2');
    } else if (val === 'h3') {
      execCmd('formatBlock', 'h3');
    } else if (val === 'blockquote') {
      execCmd('formatBlock', 'blockquote');
    }
    e.target.value = ''; // Reset select tag index
  };

  // Font Family picker handler
  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCmd('fontName', e.target.value);
  };

  // Font Size picker handler
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCmd('fontSize', e.target.value);
  };

  // Color picker handler
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCmd('foreColor', e.target.value);
  };

  // Text highlight color picker handler
  const handleHighlightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCmd('hiliteColor', e.target.value);
  };

  // Insert URL anchor tag
  const insertLink = () => {
    const url = prompt('Enter the link URL (e.g. https://google.com):', 'https://');
    if (url) {
      execCmd('createLink', url);
    }
  };

  // Insert visual layout tables
  const insertTable = () => {
    const cols = parseInt(prompt('Enter number of columns:', '3') || '3', 10);
    const rows = parseInt(prompt('Enter number of rows:', '3') || '3', 10);
    
    if (isNaN(cols) || isNaN(rows) || cols <= 0 || rows <= 0) return;

    let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:15px 0; font-family:Arial, sans-serif;">';
    tableHtml += '<thead><tr style="background-color:#f8fafc;">';
    for (let c = 0; c < cols; c++) {
      tableHtml += '<th style="border:1px solid #cbd5e1; padding:8px; text-align:left; font-weight:bold;">Header</th>';
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += '<td style="border:1px solid #cbd5e1; padding:8px;">Cell data</td>';
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';

    // Insert direct HTML content at cursor location
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, tableHtml);
    }
  };

  // Inline Image Insertion using standard file picker
  const handleImageImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      const imgTag = `<img src="${base64Url}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; border: 1px solid #e2e8f0; display: block;" alt="Embedded visual asset" />`;
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertHTML', false, imgTag);
        handleStatsUpdate();
      }
    };
    reader.readAsDataURL(file);
  };

  // Apply templates
  const applyTemplate = (key: 'minimal' | 'resume' | 'proposal' | 'meeting') => {
    if (editorRef.current) {
      editorRef.current.innerHTML = templates[key].html;
      setDocTitle(templates[key].title);
      handleStatsUpdate();
    }
  };

  // Document Find and Replace
  const handleFindReplace = () => {
    if (!editorRef.current || !findText) return;
    const bodyHtml = editorRef.current.innerHTML;

    // Direct case-insensitive replacement mapping
    const escapedFindText = findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedFindText, 'gi');
    
    // Warn before matching raw HTML formatting strings
    if (editorRef.current.innerText.toLowerCase().includes(findText.toLowerCase())) {
      const updatedHtml = bodyHtml.replace(regex, replaceText);
      editorRef.current.innerHTML = updatedHtml;
      handleStatsUpdate();
      alert(`Replaced matching text segments: "${findText}" with "${replaceText}"!`);
    } else {
      alert(`Could not find any matching characters for "${findText}"`);
    }
  };

  // Import Word / HTML / Text file
  const handleDocumentOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    // Parse depending on extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    reader.onload = (event) => {
      const outcome = event.target?.result as string;
      if (editorRef.current) {
        if (ext === 'html' || ext === 'htm') {
          editorRef.current.innerHTML = outcome;
        } else if (ext === 'md') {
          // Convert simple markdown headings & lists
          let convertedHtml = outcome
            .replace(/^# (.*$)/gim, '<h1 style="font-family: Arial;">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 style="font-family: Arial;">$1</h2>')
            .replace(/^### (.*$)/gim, '<h3 style="font-family: Arial;">$1</h3>')
            .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
            .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n$/gim, '<br/>');
          editorRef.current.innerHTML = convertedHtml;
        } else {
          // Standard text lines
          const paragraphs = outcome.split(/\n\s*\n/).map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
          editorRef.current.innerHTML = paragraphs;
        }
        
        // Use clean file name
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
        handleStatsUpdate();
      }
    };

    if (ext === 'xlsx' || ext === 'xls') {
      alert('Selected file appears to be a spreadsheet. Please use the DPLK Excel Editor for table layouts.');
    } else {
      reader.readAsText(file);
    }
  };

  // Export as Word Document or HTML
  const handleExport = (format: 'docx' | 'html' | 'txt') => {
    if (!editorRef.current) return;
    const bodyHtml = editorRef.current.innerHTML;
    
    let mimeType = 'text/plain';
    let content = '';
    let ext = 'txt';

    if (format === 'html') {
      mimeType = 'text/html;charset=utf-8';
      content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${docTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; }
            blockquote { border-left: 4px solid #cbd5e1; padding-left: 12px; font-style: italic; color: #475569; }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
        </html>
      `;
      ext = 'html';
    } 
    else if (format === 'docx') {
      // Elegant, universally supported Microsoft Doc Word HTML schema
      mimeType = 'application/msword;charset=utf-8';
      content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${docTitle}</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            p, h1, h2, h3, li, blockquote, td { font-family: 'Arial', 'Times New Roman', serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #94a3b8; padding: 6px; }
            blockquote { border-left: 4px solid #64748b; padding-left: 10px; margin-left: 10px; color: #475569; }
          </style>
        </head>
        <body>
          ${bodyHtml}
        </body>
        </html>
      `;
      ext = 'doc';
    } 
    else {
      content = editorRef.current.innerText || '';
      ext = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const localUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = localUrl;
    link.download = `${docTitle.trim().replace(/\s+/g, '_')}_DPLK_Tools.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(localUrl);
  };

  // Launch browser native print dialog to save as PDF
  const triggerNativePrint = () => {
    window.print();
  };

  // Get responsive margins class
  const getMarginStyle = () => {
    if (margins === 'narrow') return 'px-8 py-8 sm:px-10';
    if (margins === 'wide') return 'px-20 py-16 sm:px-24';
    return 'px-14 py-12 sm:px-16'; // normal
  };

  return (
    <div className="bg-slate-100 min-h-screen text-slate-800 flex flex-col font-sans" id="word-editor-view">
      
      {/* Top Navbar / Header banner */}
      <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 flex items-center justify-between shadow-md print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 px-3 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-slate-200 hover:text-white transition text-xs font-bold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>PDF Toolbox</span>
          </button>
          
          <div className="h-5 w-[1px] bg-slate-700 hidden sm:block"></div>
          
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1 rounded-md">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="font-bold text-sm tracking-tight bg-slate-800 focus:bg-slate-950 focus:ring-1 focus:ring-blue-500 rounded px-2.5 py-1 w-44 sm:w-64 text-white focus:outline-none transition border-none"
              placeholder="Title of Document"
              title="Click to rename document"
            />
            <span className="hidden lg:inline bg-blue-500/10 text-blue-400 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded border border-blue-500/20">
              WYSIWYG Word V1.8
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* File input import trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
            title="Import Markdown, HTML or Raw Text"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Import Document</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt, .html, .htm, .md"
            className="hidden"
            onChange={handleDocumentOpen}
          />

          {/* Export selectors */}
          <div className="relative group">
            <button
              type="button"
              className="p-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export File</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 hidden group-hover:block z-50 text-slate-700 font-sans text-xs">
              <button
                type="button"
                onClick={() => handleExport('docx')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Word Doc (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('html')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <div className="h-3.5 w-3.5 bg-rose-100 rounded text-[9px] font-black text-rose-700 flex items-center justify-center">H</div>
                <span>HTML Output (.html)</span>
              </button>
              <button
                type="button"
                onClick={() => handleExport('txt')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 font-medium flex items-center gap-2"
              >
                <div className="h-3.5 w-3.5 bg-slate-100 rounded text-[9px] font-black text-slate-700 flex items-center justify-center">T</div>
                <span>Plain Text (.txt)</span>
              </button>
            </div>
          </div>

          {/* Print PDF trigger */}
          <button
            type="button"
            onClick={triggerNativePrint}
            className="p-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg flex items-center gap-1 text-xs"
            title="Export as PDF / Print Document"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden md:inline">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Editor Main Ribbon tab selection bar */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="flex px-4 border-b border-slate-200">
          {[
            { id: 'templates', label: 'Document Templates', color: 'text-amber-600 border-amber-600' },
            { id: 'home', label: 'Styles & Typography', color: 'text-blue-600 border-blue-600' },
            { id: 'insert', label: 'Insert Active Elements', color: 'text-emerald-600 border-emerald-600' },
            { id: 'layout', label: 'Page Margin Settings', color: 'text-purple-600 border-purple-600' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold border-b-2 hover:bg-slate-50 transition ${
                activeTab === tab.id 
                  ? `${tab.color} bg-slate-50/50` 
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Panel content based on tab index */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 min-h-[56px] flex flex-wrap items-center gap-4 text-xs">
          
          {/* Templates library */}
          {activeTab === 'templates' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Templates gallery:</span>
              <button
                type="button"
                onClick={() => applyTemplate('minimal')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <div className="h-3.5 w-3.5 rounded bg-slate-100 border border-slate-300"></div>
                <span>Blank Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('resume')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Executive Resume / CV</span>
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('proposal')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                <span>Project Pitch Proposal</span>
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('meeting')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 font-bold transition"
              >
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span>Formal Meeting Notes</span>
              </button>
            </div>
          )}

          {/* Typography Panel */}
          {activeTab === 'home' && (
            <div className="flex items-center gap-4 flex-wrap">
              
              {/* Layout Styles */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
                <span className="font-semibold text-slate-500">Heading Style:</span>
                <select
                  onChange={handleHeaderChange}
                  defaultValue=""
                  className="bg-white border border-slate-200 rounded-md p-1 font-sans text-xs hover:border-slate-300 focus:outline-none"
                >
                  <option value="" disabled>--- Select block ---</option>
                  <option value="p">Paragraph / Normal</option>
                  <option value="h1">Display Title (H1)</option>
                  <option value="h2">Section Header (H2)</option>
                  <option value="h3">Subsection Title (H3)</option>
                  <option value="blockquote">Blockquote Citation</option>
                </select>
              </div>

              {/* Font Picker */}
              <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3">
                <span className="font-semibold text-slate-500">Font:</span>
                <select
                  onChange={handleFontChange}
                  defaultValue="Arial"
                  className="bg-white border border-slate-200 rounded-md p-1 font-sans text-xs hover:border-slate-300 focus:outline-none"
                >
                  <option value="Arial">Sans-Serif (Arial)</option>
                  <option value="Times New Roman">Classic Serif (Times New Roman)</option>
                  <option value="Courier New">Developer Monospace (Courier New)</option>
                  <option value="Georgia">Editorial Georgia</option>
                  <option value="Impact">Bold Impact</option>
                </select>
              </div>

              {/* Bold, Italic, Underline, Strikethrough buttons */}
              <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => execCmd('bold')}
                  className="p-1.5 px-3 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-r border-slate-200"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('italic')}
                  className="p-1.5 px-3 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-r border-slate-200"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('underline')}
                  className="p-1.5 px-3 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-r border-slate-200"
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('strikeThrough')}
                  className="p-1.5 px-3 hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                  title="Strikethrough"
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Alignments Panel block */}
              <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => execCmd('justifyLeft')}
                  className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-600 border-r border-slate-200"
                  title="Align Left"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyCenter')}
                  className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-600 border-r border-slate-200"
                  title="Align Center"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyRight')}
                  className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-600 border-r border-slate-200"
                  title="Align Right"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyFull')}
                  className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-600"
                  title="Justify Content"
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Paragraph format indicators (Lists) */}
              <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => execCmd('insertUnorderedList')}
                  className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-600 border-r border-slate-200"
                  title="Unordered List"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('insertOrderedList')}
                  className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-600"
                  title="Numbered List"
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Formatting Palette: Colors selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <span className="text-[10px] px-1 font-bold text-slate-400">Color:</span>
                  <input
                    type="color"
                    onChange={handleColorChange}
                    className="w-5 h-5 border-none p-0 cursor-pointer rounded bg-transparent"
                    title="Change Text Color"
                    defaultValue="#000000"
                  />
                  <div className="w-[1px] h-3 bg-slate-200 mx-1"></div>
                  <span className="text-[10px] px-1 font-bold text-slate-400">Highlighter:</span>
                  <input
                    type="color"
                    onChange={handleHighlightChange}
                    className="w-5 h-5 border-none p-0 cursor-pointer rounded bg-transparent"
                    title="Highlight Text Background"
                    defaultValue="#ffff00"
                  />
                </div>
              </div>

              {/* Undo and Redo control buttons */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => execCmd('undo')}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-md"
                  title="Undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('redo')}
                  className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-md"
                  title="Redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Insert Active elements Panel */}
          {activeTab === 'insert' && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-slate-500">Insert Utilities:</span>
              
              <button
                type="button"
                onClick={insertTable}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 rounded-lg flex items-center gap-1.5 font-bold transition text-emerald-700"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Rich Grid Table</span>
              </button>

              <button
                type="button"
                onClick={insertLink}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg flex items-center gap-1.5 font-bold transition text-blue-700"
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Hyperlink</span>
              </button>

              {/* Direct image injector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => document.getElementById('embedded-img-input')?.click()}
                  className="p-1.5 px-3 bg-white border border-slate-200 hover:bg-teal-50 hover:border-teal-300 rounded-lg flex items-center gap-1.5 font-bold transition text-teal-700 cursor-pointer"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>Insert Local Image</span>
                </button>
                <input
                  id="embedded-img-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageImport}
                />
              </div>

              <button
                type="button"
                onClick={() => execCmd('insertHorizontalRule')}
                className="p-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1"
              >
                <span className="font-mono text-[9px] text-slate-400">---</span>
                <span>Divider Rule</span>
              </button>
            </div>
          )}

          {/* Page margin settings */}
          {activeTab === 'layout' && (
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-slate-500">Document Margins Layout:</span>

              <div className="flex border border-slate-200 rounded-lg bg-white overflow-hidden p-0.5">
                {[
                  { id: 'normal', label: 'Normal (1 in / 2.54 cm)' },
                  { id: 'narrow', label: 'Narrow (0.5 in / 1.27 cm)' },
                  { id: 'wide', label: 'Wide (1.5 in / 3.8 cm)' }
                ].map((mOpt) => (
                  <button
                    key={mOpt.id}
                    type="button"
                    onClick={() => setMargins(mOpt.id as any)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold ${margins === mOpt.id ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {mOpt.label}
                  </button>
                ))}
              </div>

              <div className="h-4 w-[1px] bg-slate-200"></div>

              {/* Zoom controls */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-400">Viewport Scale:</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.max(50, zoom - 10))}
                  className="p-1 bg-white border border-slate-200 hover:bg-slate-50 rounded"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <span className="font-mono font-bold w-10 text-center">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom(Math.min(150, zoom + 10))}
                  className="p-1 bg-white border border-slate-200 hover:bg-slate-50 rounded"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Find & Replace Widget bar */}
        <div className="bg-slate-150 p-2 flex items-center justify-between px-4 border-b border-slate-200 text-xs">
          <div className="flex items-center gap-4 flex-wrap w-full">
            <button
              type="button"
              onClick={() => setShowFindReplace(!showFindReplace)}
              className="flex items-center gap-1 text-slate-600 hover:text-blue-600 transition font-semibold"
            >
              <Search className="h-3.5 w-3.5" />
              <span>{showFindReplace ? 'Hide Find & Replace' : 'Find & Replace Text'}</span>
            </button>

            {showFindReplace && (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Draft search query..."
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  className="bg-white border border-slate-200 rounded p-1 px-2.5 w-40 sm:w-48 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                
                <span className="text-slate-400">→</span>

                <input
                  type="text"
                  placeholder="Substitute with..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="bg-white border border-slate-200 rounded p-1 px-2.5 w-40 sm:w-48 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleFindReplace}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded p-1 px-3"
                >
                  Replace All
                </button>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-400 font-mono hidden md:block">
            Standard contentEditable active selection framework
          </div>
        </div>
      </div>

      {/* Main interactive Word canvas sheet and sidebar container */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-7xl mx-auto w-full print:p-0 print:max-w-none">
        
        {/* Left Stats Indicator panel */}
        <div className="w-full md:w-64 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-4.5 print:hidden shrink-0 self-start">
          <h4 className="font-bold text-slate-800 text-xs tracking-wide uppercase border-b border-slate-100 pb-2">
            Realtime Doc Intelligence
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 text-xs">Total Words</span>
              <span className="font-mono font-bold text-sm text-slate-900">{stats.words}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 text-xs">All Characters</span>
              <span className="font-mono font-bold text-sm text-slate-900">{stats.chars}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 text-xs">Paragraphs</span>
              <span className="font-mono font-bold text-sm text-slate-900">{stats.paragraphs}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 text-xs">Reading Time</span>
              <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{stats.readingTime} min</span>
              </span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex flex-col gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Full WYSIWYG Styling engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Export cleanly to MS Word format</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Client-side security verified</span>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 text-[11px] text-amber-800 flex flex-col gap-1 mt-auto">
            <div className="flex items-center gap-1 font-bold">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
              <span>Secured Sandbox</span>
            </div>
            <p className="leading-normal">All edits remain 100% internal inside your browser loop. Your confidential data never transits to external servers.</p>
          </div>
        </div>

        {/* Word Document Canvas container */}
        <div className="flex-1 flex flex-col items-center">
          
          {/* Top visual paper ruler */}
          <div className="w-full max-w-[800px] h-6 bg-slate-200/80 border border-slate-300 rounded-t-lg flex items-center relative overflow-hidden text-[9px] text-slate-400 font-mono print:hidden">
            <div className="absolute left-4 font-bold text-slate-500">0 in</div>
            <div className="absolute left-1/4">| | | | 1</div>
            <div className="absolute left-2/4 text-center">| | | | 2</div>
            <div className="absolute left-3/4">| | | | 3</div>
            <div className="absolute right-4 font-bold text-slate-500">6.5 in</div>
          </div>

          {/* Styled Word processing sheet canvas */}
          <div 
            className="w-full max-w-[800px] bg-white border border-slate-200 shadow-xl transition-all duration-200 outline-none print:shadow-none print:border-none print:w-full print:max-w-none"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              minHeight: '1050px',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            <div
              id="wysiwyg-word-editor"
              ref={editorRef}
              contentEditable
              onInput={handleStatsUpdate}
              onKeyUp={handleStatsUpdate}
              className={`w-full min-h-[950px] outline-none font-sans text-slate-800 text-sm leading-relaxed prose prose-slate max-w-none ${getMarginStyle()}`}
              style={{
                outline: 'none',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap'
              }}
              placeholder="Begin drafting your secure Word document..."
            >
            </div>
          </div>

          {/* Canvas help footer */}
          <div className="mt-4 text-xs text-slate-400 text-center pb-8 print:hidden">
            Tip: Press <kbd className="bg-white border rounded px-1 text-[10px] font-bold">Tab</kbd> or right-click to select formatting blocks seamlessly.
          </div>

        </div>

      </div>

      {/* Dynamic formula cheatsheet modal popup */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Offline Doc CheatSheet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed flex flex-col gap-3">
              <p>The DPLK Word Editor supports direct WYSIWYG typing with responsive offline formatting.</p>
              
              <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-2 font-mono text-[11px] text-slate-700">
                <div className="font-bold text-slate-900 text-xs">Supported Actions:</div>
                <div>• Insert fully editable grid tables</div>
                <div>• Double click headings to wrap text blocks</div>
                <div>• Import `.md` markdown files automatically</div>
                <div>• Save natively to Microsoft Word MIME formats</div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg flex flex-col gap-1.5 text-blue-900">
                <div className="font-bold text-xs">HTML Export Parity</div>
                <p className="text-[11px]">Downloaded `.doc` files utilize the Word HTML wrapper Schema allowing colors, tables, and spacing to open exactly as formatted.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs p-2.5 rounded-lg transition"
            >
              Close instructions
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
