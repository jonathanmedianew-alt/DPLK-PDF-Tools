/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ToolId, AccessRequest } from './types';
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
import AccessVerificationGate from './components/AccessVerificationGate';
import AdminPanel from './components/AdminPanel';
import { fetchCloudRequests } from './lib/syncService';
import { Layers, HelpCircle, FileText, Globe, ShieldAlert, LogOut } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(localStorage.getItem('dplk_verified_email'));
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [rebuildCounter, setRebuildCounter] = useState(0);

  const selectTool = (id: ToolId | null) => {
    setActiveTool(id);
  };

  // Sync session state and requests cloud database
  useEffect(() => {
    const handleActiveRegistry = async () => {
      const email = localStorage.getItem('dplk_verified_email');
      setSessionEmail(email);

      try {
        const list = await fetchCloudRequests();
        setRequests(list);
      } catch (err) {
        // Fallback from localStorage
        const saved = localStorage.getItem('dplk_access_requests');
        if (saved) {
          try { setRequests(JSON.parse(saved)); } catch (e) {}
        }
      }
    };

    handleActiveRegistry();
    const interval = setInterval(handleActiveRegistry, 3000);
    return () => clearInterval(interval);
  }, [rebuildCounter]);

  const triggerRefresh = () => {
    setRebuildCounter(prev => prev + 1);
  };

  // Check access authorization
  const getIsUnlocked = (): boolean => {
    if (!sessionEmail) return false;
    const clean = sessionEmail.trim().toLowerCase();
    if (clean === 'jonathanmedianew@gmail.com') return true; // Master Override
    
    // Check if approved in registries
    const found = requests.find(r => r.email === clean);
    return found?.status === 'approved';
  };

  const isUnlocked = getIsUnlocked();
  const isAdmin = sessionEmail?.trim().toLowerCase() === 'jonathanmedianew@gmail.com';

  const handleLogout = () => {
    localStorage.removeItem('dplk_verified_email');
    setSessionEmail(null);
    setShowAdminPanel(false);
    selectTool(null);
    triggerRefresh();
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
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-50 shadow-xs animate-fade-in" id="primary-header">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            type="button" 
            onClick={() => {
              if (isUnlocked) {
                setShowAdminPanel(false);
                selectTool(null);
              }
            }}
            disabled={!isUnlocked}
            className={`flex items-center gap-2.5 font-bold text-gray-900 tracking-tight text-lg transition duration-150 ${isUnlocked ? 'hover:text-rose-600 cursor-pointer' : 'opacity-70'}`}
          >
            <div className="bg-rose-600 text-white p-1.5 rounded-lg shadow-sm">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <span>DPLK Tools</span>
          </button>

          {/* Core Shortcuts (only available if verified) */}
          {isUnlocked && !showAdminPanel && (
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
          )}

          <div className="flex items-center gap-3">
            {isUnlocked ? (
              <div className="flex items-center gap-3">
                {/* Admin Console shortcut link */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPanel(!showAdminPanel);
                      selectTool(null);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                      showAdminPanel 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>{showAdminPanel ? 'Dashboard' : 'Admin Panel'}</span>
                  </button>
                )}

                {/* Logged in Email Info and logout */}
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-800 tracking-tight">{sessionEmail}</span>
                  <span className="text-[9px] text-emerald-600 font-medium">Verified Active</span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-rose-600 border border-gray-200/60 rounded-lg transition scroll-p-1 cursor-pointer"
                  title="Disconnect and Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-mono text-gray-450 bg-gray-50 border border-gray-150 rounded-lg px-2 py-1 flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-emerald-500 animate-pulse" />
                <span>Security Engine Offloaded</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main active content viewport */}
      <main className="flex-1" id="main-viewport">
        {!isUnlocked ? (
          <AccessVerificationGate onSuccess={triggerRefresh} />
        ) : showAdminPanel ? (
          <AdminPanel onBack={() => setShowAdminPanel(false)} onRefreshSiteAccess={triggerRefresh} />
        ) : (
          getActiveToolComponent()
        )}
      </main>

      {/* Elegant minimalist footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center mt-auto" id="primary-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <p>© 2026 DPLK Tools Inc. Powered by high-speed client compilation pipelines.</p>
          <div className="flex gap-4">
            <span className="hover:text-gray-650 cursor-pointer">Security Sandbox</span>
            <span>•</span>
            <span className="hover:text-gray-650 cursor-pointer">Local Privacy Shield</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
