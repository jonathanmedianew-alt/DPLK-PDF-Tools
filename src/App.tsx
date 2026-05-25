/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ToolId } from './types';
import Dashboard from './components/Dashboard';
import MergeTool from './components/MergeTool';
import SplitTool from './components/SplitTool';
import CompressTool from './components/CompressTool';
import ConvertTool from './components/ConvertTool';
import EditTool from './components/EditTool';
import ExcelEditor from './components/ExcelEditor';
import WordEditor from './components/WordEditor';
import SignTool from './components/SignTool';
import WatermarkTool from './components/WatermarkTool';
import PowerpointEditor from './components/PowerpointEditor';
import { Layers, HelpCircle, FileText, Globe } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);

  const selectTool = (id: ToolId | null) => {
    setActiveTool(id);
  };

  const getActiveToolComponent = () => {
    if (!activeTool) return <Dashboard onSelectTool={selectTool} />;

    switch (activeTool) {
      case 'merge':
        return <MergeTool onBack={() => selectTool(null)} />;
      case 'split':
        return <SplitTool onBack={() => selectTool(null)} />;
      case 'compress':
        return <CompressTool onBack={() => selectTool(null)} />;
      case 'edit':
        return <EditTool onBack={() => selectTool(null)} />;
      case 'excel-editor':
        return <ExcelEditor onBack={() => selectTool(null)} />;
      case 'word-editor':
        return <WordEditor onBack={() => selectTool(null)} />;
      case 'sign':
        return <SignTool onBack={() => selectTool(null)} />;
      case 'watermark':
        return <WatermarkTool onBack={() => selectTool(null)} />;
      case 'powerpoint-editor':
        return <PowerpointEditor onBack={() => selectTool(null)} />;
      default:
        // Handles conversions (pdf-to-word, pdf-to-powerpoint, pdf-to-excel, word-to-pdf, etc.)
        return <ConvertTool mode={activeTool} onBack={() => selectTool(null)} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans selection:bg-rose-500/10 selection:text-rose-900" id="app-root">
      {/* Visual Navigation Header */}
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-50 shadow-xs" id="primary-header">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            type="button" 
            onClick={() => selectTool(null)}
            className="flex items-center gap-2.5 font-bold text-gray-900 tracking-tight text-lg transition duration-150 hover:text-rose-600"
          >
            <div className="bg-rose-600 text-white p-1.5 rounded-lg shadow-sm">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <span>DPLK Tools</span>
          </button>

          {/* Core Shortcuts */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              type="button" 
              onClick={() => selectTool('merge')}
              className={`text-xs font-bold transition hover:text-rose-600 ${activeTool === 'merge' ? 'text-rose-600' : 'text-gray-500'}`}
            >
              Merge
            </button>
            <button 
              type="button" 
              onClick={() => selectTool('split')}
              className={`text-xs font-bold transition hover:text-rose-600 ${activeTool === 'split' ? 'text-rose-600' : 'text-gray-500'}`}
            >
              Split
            </button>
            <button 
              type="button" 
              onClick={() => selectTool('compress')}
              className={`text-xs font-bold transition hover:text-rose-600 ${activeTool === 'compress' ? 'text-rose-600' : 'text-gray-500'}`}
            >
              Compress
            </button>
            <button 
              type="button" 
              onClick={() => selectTool('edit')}
              className={`text-xs font-bold transition hover:text-rose-600 ${activeTool === 'edit' ? 'text-rose-600' : 'text-gray-500'}`}
            >
              Edit PDF
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button" 
              onClick={() => selectTool('excel-editor')}
              className={`text-xs font-bold transition hover:text-emerald-600 ${activeTool === 'excel-editor' ? 'text-emerald-600' : 'text-slate-700'}`}
            >
              Excel Editor
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button" 
              onClick={() => selectTool('word-editor')}
              className={`text-xs font-bold transition hover:text-blue-600 ${activeTool === 'word-editor' ? 'text-blue-600' : 'text-slate-700'}`}
            >
              Word Editor
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button" 
              onClick={() => selectTool('powerpoint-editor')}
              className={`text-xs font-bold transition hover:text-amber-600 ${activeTool === 'powerpoint-editor' ? 'text-amber-600' : 'text-slate-750'}`}
            >
              PowerPoint Editor
            </button>
            <span className="text-gray-300">|</span>
            <button 
              type="button" 
              onClick={() => selectTool('pdf-to-word')}
              className="text-xs font-bold text-gray-500 transition hover:text-rose-600"
            >
              Convert Forms
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 flex items-center gap-1">
              <Globe className="h-3 w-3 text-emerald-500" />
              <span>100% Offline Secured</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main active content viewport */}
      <main className="flex-1" id="main-viewport">
        {getActiveToolComponent()}
      </main>

      {/* Elegant minimalist footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center mt-auto" id="primary-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© 2026 DPLK Tools Inc. Powered by high-speed client compilation pipelines.</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-600 cursor-pointer">Security Sandbox</span>
            <span>•</span>
            <span className="hover:text-gray-600 cursor-pointer">Local Privacy Shield</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
