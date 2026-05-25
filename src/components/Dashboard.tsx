import React, { useState } from 'react';
import { ToolId, PDFTool } from '../types';
import { 
  Layers, Scissors, Zap, FileText, Presentation, 
  FileSpreadsheet, Edit3, Grid, ArrowUpDown, Sparkles,
  PenTool, Stamp, Lock, Unlock
} from 'lucide-react';

interface DashboardProps {
  onSelectTool: (id: ToolId) => void;
}

export default function Dashboard({ onSelectTool }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'organize' | 'convert-from' | 'convert-to' | 'edit'>('all');

  const getPowerpointAccessStatus = (): 'locked' | 'unlocked' => {
    const verifiedEmail = localStorage.getItem('dplk_verified_email');
    if (!verifiedEmail) return 'locked';
    const savedRequests = localStorage.getItem('dplk_access_requests');
    if (savedRequests) {
      try {
        const requests = JSON.parse(savedRequests);
        const req = requests.find((r: any) => r.email === verifiedEmail.trim().toLowerCase());
        return req?.status === 'approved' ? 'unlocked' : 'locked';
      } catch (e) {
        return 'locked';
      }
    }
    return 'locked';
  };

  const ppStatus = getPowerpointAccessStatus();

  const tools: PDFTool[] = [
    {
      id: 'merge',
      title: 'Merge PDF',
      shortDesc: 'Combine PDFs in the order you want with the easiest PDF merger available.',
      description: 'Combine PDFs in the order you want with the easiest PDF merger available.',
      icon: 'Layers',
      category: 'organize',
      color: 'bg-rose-50 hover:bg-rose-100 hover:border-rose-400 text-rose-600 border-rose-100'
    },
    {
      id: 'split',
      title: 'Split PDF',
      shortDesc: 'Separate one page or a whole set for easy conversion into independent PDF files.',
      description: 'Separate one page or a whole set for easy conversion into independent PDF files.',
      icon: 'Scissors',
      category: 'organize',
      color: 'bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400 text-indigo-600 border-indigo-100'
    },
    {
      id: 'compress',
      title: 'Compress PDF',
      shortDesc: 'Reduce file size while optimizing for maximal PDF quality.',
      description: 'Reduce file size while optimizing for maximal PDF quality.',
      icon: 'Zap',
      category: 'optimize',
      color: 'bg-amber-50 hover:bg-amber-100 hover:border-amber-400 text-amber-600 border-amber-100'
    },
    {
      id: 'pdf-to-word',
      title: 'PDF to Word',
      shortDesc: 'Convert your PDF files into easy to edit DOC and DOCX documents.',
      description: 'Easily convert your PDF files into easy to edit DOC and DOCX documents. The converted WORD document is almost 100% accurate.',
      icon: 'FileText',
      category: 'convert-from',
      color: 'bg-blue-50 hover:bg-blue-100 hover:border-blue-400 text-blue-600 border-blue-100'
    },
    {
      id: 'pdf-to-powerpoint',
      title: 'PDF to PowerPoint',
      shortDesc: 'Turn your PDF files into easy to edit PPT and PPTX slideshows.',
      description: 'Turn your PDF files into easy to edit PPT and PPTX slideshows.',
      icon: 'Presentation',
      category: 'convert-from',
      color: 'bg-orange-50 hover:bg-orange-100 hover:border-orange-400 text-orange-600 border-orange-100'
    },
    {
      id: 'pdf-to-excel',
      title: 'PDF to Excel',
      shortDesc: 'Pull data straight from PDFs into Excel spreadsheets in a few short seconds.',
      description: 'Pull data straight from PDFs into Excel spreadsheets in a few short seconds.',
      icon: 'FileSpreadsheet',
      category: 'convert-from',
      color: 'bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 text-emerald-600 border-emerald-100'
    },
    {
      id: 'word-to-pdf',
      title: 'Word to PDF',
      shortDesc: 'Make DOC and DOCX files easy to read by converting them to PDF.',
      description: 'Make DOC and DOCX files easy to read by converting them to PDF.',
      icon: 'FileText',
      category: 'convert-to',
      color: 'bg-sky-50 hover:bg-sky-100 hover:border-sky-400 text-sky-600 border-sky-100'
    },
    {
      id: 'powerpoint-to-pdf',
      title: 'PowerPoint to PDF',
      shortDesc: 'Make PPT and PPTX slideshows easy to view by converting them to PDF.',
      description: 'Make PPT and PPTX slideshows easy to view by converting them to PDF.',
      icon: 'Presentation',
      category: 'convert-to',
      color: 'bg-red-50 hover:bg-red-100 hover:border-red-400 text-red-600 border-red-100'
    },
    {
      id: 'excel-to-pdf',
      title: 'Excel to PDF',
      shortDesc: 'Make EXCEL spreadsheets easy to read by converting them to PDF.',
      description: 'Make EXCEL spreadsheets easy to read by converting them to PDF.',
      icon: 'FileSpreadsheet',
      category: 'convert-to',
      color: 'bg-green-50 hover:bg-green-100 hover:border-green-400 text-green-600 border-green-100'
    },
    {
      id: 'edit',
      title: 'Edit PDF',
      shortDesc: 'Add text, images, shapes or freehand annotations to a PDF document.',
      description: 'Add text, images, shapes or freehand annotations to a PDF document. Edit the size, font, and color of the added content.',
      icon: 'Edit3',
      category: 'edit',
      color: 'bg-rose-50 hover:bg-rose-100 hover:border-rose-400 text-rose-500 border-rose-100'
    },
    {
      id: 'excel-editor',
      title: 'Excel Editor',
      shortDesc: 'Create, edit, and analyze professional Excel sheets with formulas, formatting, and charts.',
      description: 'Free browser-based Excel sheet editor. Design budgets, manage projects, and analyze data with formulas (SUM, AVERAGE, etc.), dynamic charts, and seamless XLSX import/export.',
      icon: 'FileSpreadsheet',
      category: 'edit',
      color: 'bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-400 text-emerald-600 border-emerald-100'
    },
    {
      id: 'word-editor',
      title: 'Word Editor',
      shortDesc: 'Create, edit, and format professional Word documents with a powerful rich-text editor.',
      description: 'Free browser-based Word document creator. Structure resumes, proposals, and newsletters, apply headings/styles, insert tables & images, and export directly as Word files.',
      icon: 'FileText',
      category: 'edit',
      color: 'bg-blue-50 hover:bg-blue-100 hover:border-blue-400 text-blue-600 border-blue-100'
    },
    {
      id: 'powerpoint-editor',
      title: 'PowerPoint Editor',
      shortDesc: 'Create, design, and display slides dynamic presentations like PowerPoint.',
      description: 'Create, design, and present amazing slide decks. Control background style, rich layouts, insert shapes, text boxes, and run beautiful animated presentation slideshow screens natively.',
      icon: 'Presentation',
      category: 'edit',
      color: 'bg-amber-50 hover:bg-amber-100 hover:border-amber-400 text-amber-600 border-amber-100'
    },
    {
      id: 'sign',
      title: 'Sign PDF',
      shortDesc: 'Sign yourself or request electronic signatures from others.',
      description: 'Sign yourself or request electronic signatures from others. Draw signature, type your name, or upload an image and position it layout-perfect on pages.',
      icon: 'PenTool',
      category: 'organize',
      color: 'bg-violet-50 hover:bg-violet-100 hover:border-violet-400 text-violet-600 border-violet-100'
    },
    {
      id: 'watermark',
      title: 'Watermark',
      shortDesc: 'Stamp an image or text over your PDF in seconds. Choose the typography, transparency and position.',
      description: 'Stamp an image or text over your PDF in seconds. Choose the typography, transparency and position.',
      icon: 'Stamp',
      category: 'edit',
      color: 'bg-teal-50 hover:bg-teal-100 hover:border-teal-400 text-teal-600 border-teal-100'
    }
  ];

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Layers': return <Layers className="h-6 w-6" />;
      case 'Scissors': return <Scissors className="h-6 w-6" />;
      case 'Zap': return <Zap className="h-6 w-6 animate-pulse" />;
      case 'FileText': return <FileText className="h-6 w-6" />;
      case 'Presentation': return <Presentation className="h-6 w-6" />;
      case 'FileSpreadsheet': return <FileSpreadsheet className="h-6 w-6" />;
      case 'Edit3': return <Edit3 className="h-6 w-6" />;
      case 'PenTool': return <PenTool className="h-6 w-6" />;
      case 'Stamp': return <Stamp className="h-6 w-6" />;
      default: return <FileText className="h-6 w-6" />;
    }
  };

  const filteredTools = tools.filter((tool) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'organize') return tool.category === 'organize';
    if (activeTab === 'convert-from') return tool.category === 'convert-from';
    if (activeTab === 'convert-to') return tool.category === 'convert-to';
    if (activeTab === 'edit') return tool.category === 'edit' || tool.category === 'optimize';
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12" id="dashboard-view">
      
      {/* Title & Slogan Section */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-4 shadow-xs">
          <Sparkles className="h-3 w-3" />
          100% Secure Client-Side Engine
        </div>
        <h1 className="text-4xl sm:text-5xl font-sans font-bold text-gray-900 tracking-tight leading-tight">
          Every tool you need to <span className="text-rose-600">work with PDFs, Sheets & Docs</span>, in one place
        </h1>
        <p className="text-gray-500 text-base mt-4 font-sans leading-relaxed">
          Every tool is 100% free and easy to use! Edit, format, and visualize Word documents & Excel sheets, or merge, split, compress, and annotate your PDFs directly in your web browser.
        </p>
      </div>

      {/* Tabs list bar */}
      <div className="flex justify-center flex-wrap gap-2 mb-10 max-w-3xl mx-auto border-b border-gray-100 pb-4">
        {[
          { key: 'all', label: 'All Tools', count: tools.length },
          { key: 'organize', label: 'Organize PDF', count: tools.filter(t => t.category === 'organize').length },
          { key: 'convert-from', label: 'Convert From PDF', count: tools.filter(t => t.category === 'convert-from').length },
          { key: 'convert-to', label: 'Convert To PDF', count: tools.filter(t => t.category === 'convert-to').length },
          { key: 'edit', label: 'Edit & Documents', count: tools.filter(t => t.category === 'edit' || t.category === 'optimize').length },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === tab.key
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/10'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-sans px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-rose-700 text-rose-50' : 'bg-gray-100 text-gray-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Primary Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {filteredTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onSelectTool(tool.id)}
            className={`group text-left border rounded-2xl p-5 shadow-xs transition duration-200 cursor-pointer flex flex-col justify-between align-stretch min-h-[220px] bg-white ${tool.color}`}
          >
            <div>
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 shadow-sm bg-white shrink-0">
                {getIconComponent(tool.icon)}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1.5 group-hover:text-rose-600 transition flex items-center justify-between gap-1">
                <span>{tool.title}</span>
                {tool.id === 'powerpoint-editor' ? (
                  ppStatus === 'locked' ? (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Lock className="h-2.5 w-2.5 text-amber-600" />
                      <span>Gated</span>
                    </span>
                  ) : (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Unlock className="h-2.5 w-2.5 text-emerald-600" />
                      <span>Unlocked</span>
                    </span>
                  )
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 duration-200 text-rose-600 text-sm">→</span>
                )}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">
                {tool.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
