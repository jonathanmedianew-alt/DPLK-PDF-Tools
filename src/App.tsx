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
import { Layers, HelpCircle, FileText, Globe, ShieldAlert, LogOut, ChevronDown, Grid, LayoutDashboard } from 'lucide-react';

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(localStorage.getItem('dplk_verified_email'));
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [rebuildCounter, setRebuildCounter] = useState(0);

  const getToolLabel = (id: string): string => {
    const labels: Record<string, string> = {
      'merge': 'Merge PDF',
      'split': 'Split PDF',
      'compress': 'Compress PDF',
      'edit': 'Edit PDF',
      'excel-editor': 'Excel Editor',
      'word-editor': 'Word Editor',
      'powerpoint-editor': 'PowerPoint Editor',
      'sign': 'Sign PDF',
      'watermark': 'Watermark',
      'pdf-to-word': 'PDF to Word',
      'pdf-to-powerpoint': 'PDF to PowerPoint',
      'pdf-to-excel': 'PDF to Excel',
      'word-to-pdf': 'Word to PDF',
      'excel-to-pdf': 'Excel to PDF',
      'powerpoint-to-pdf': 'PowerPoint to PDF',
    };
    return labels[id] || 'Tool';
  };

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
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Breadcrumb Navigation Block */}
          <div className="flex items-center gap-2 overflow-hidden shrink-0">
            <button 
              type="button" 
              onClick={() => {
                if (isUnlocked) {
                  setShowAdminPanel(false);
                  selectTool(null);
                }
              }}
              disabled={!isUnlocked}
              className={`flex items-center gap-2 font-bold text-gray-900 tracking-tight text-base sm:text-lg transition duration-150 shrink-0 ${isUnlocked ? 'hover:text-rose-600 cursor-pointer' : 'opacity-70'}`}
            >
              <div className="bg-rose-600 text-white p-1.5 rounded-lg shadow-xs">
                <Layers className="h-4 w-4" />
              </div>
              <span className="inline text-sm sm:text-base">DPLK Tools</span>
            </button>

            {isUnlocked && (activeTool || showAdminPanel) && (
              <div className="flex items-center gap-1.5 shrink-0 select-none">
                <span className="text-gray-300 font-light text-sm">/</span>
                <span className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-200/60 px-2.5 py-0.5 rounded-md truncate max-w-[100px] sm:max-w-none">
                  {showAdminPanel ? 'Admin Panel' : getToolLabel(activeTool!)}
                </span>
              </div>
            )}
          </div>

          {/* Elegant Workspace Tools Dropdown */}
          {isUnlocked && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition duration-150 border cursor-pointer select-none ${
                  dropdownOpen 
                    ? 'bg-rose-50 border-rose-200 text-rose-700' 
                    : 'bg-gray-50 border-gray-200/85 text-gray-700 hover:bg-gray-100 hover:text-rose-600'
                }`}
              >
                <Grid className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                <span className="hidden sm:inline">Workspace Tools</span>
                <span className="sm:hidden">Tools</span>
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <>
                  {/* Backdrop for closing */}
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setDropdownOpen(false)} />
                  
                  <div className="absolute right-[-40px] sm:right-auto sm:left-1/2 sm:-translate-x-1/2 mt-2 w-[285px] sm:w-[460px] bg-white border border-gray-250/90 rounded-2xl shadow-xl shadow-gray-200/50 z-50 p-4 animate-fade-in divide-y divide-gray-150/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">PDF Utilities</h4>
                        <div className="space-y-0.5">
                          {[
                            { id: 'merge', label: 'Merge PDF' },
                            { id: 'split', label: 'Split PDF' },
                            { id: 'compress', label: 'Compress PDF' },
                            { id: 'edit', label: 'Edit PDF' },
                            { id: 'sign', label: 'Sign PDF' },
                            { id: 'watermark', label: 'Watermark' },
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                selectTool(t.id as ToolId);
                                setShowAdminPanel(false);
                                setDropdownOpen(false);
                              }}
                              className={`w-full text-left font-sans text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                activeTool === t.id 
                                  ? 'bg-rose-50 text-rose-700 font-bold' 
                                  : 'text-gray-650 hover:bg-gray-50'
                              }`}
                            >
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">Office Editors</h4>
                          <div className="space-y-0.5">
                            {[
                              { id: 'excel-editor', label: 'Excel Editor' },
                              { id: 'word-editor', label: 'Word Editor' },
                              { id: 'powerpoint-editor', label: 'PowerPoint Editor' },
                            ].map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  selectTool(t.id as ToolId);
                                  setShowAdminPanel(false);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full text-left font-sans text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                  activeTool === t.id 
                                    ? 'bg-emerald-50 text-emerald-700 font-bold' 
                                    : 'text-gray-650 hover:bg-gray-50'
                                }`}
                              >
                                <span>{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">Format Converters</h4>
                          <div className="space-y-0.5">
                            {[
                              { id: 'pdf-to-word', label: 'PDF to Word' },
                              { id: 'pdf-to-excel', label: 'PDF to Excel' },
                              { id: 'pdf-to-powerpoint', label: 'PDF to PowerPoint' },
                              { id: 'word-to-pdf', label: 'Word to PDF' },
                              { id: 'excel-to-pdf', label: 'Excel to PDF' },
                              { id: 'powerpoint-to-pdf', label: 'PowerPoint to PDF' },
                            ].map(t => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  selectTool(t.id as ToolId);
                                  setShowAdminPanel(false);
                                  setDropdownOpen(false);
                                }}
                                className={`w-full text-left font-sans text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                                  activeTool === t.id 
                                    ? 'bg-blue-50 text-blue-700 font-bold' 
                                    : 'text-gray-650 hover:bg-gray-50'
                                }`}
                              >
                                <span>{t.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          selectTool(null);
                          setShowAdminPanel(false);
                          setDropdownOpen(false);
                        }}
                        className="w-full bg-gray-50 hover:bg-gray-100 text-gray-750 hover:text-rose-600 font-sans font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-gray-100"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-rose-500" />
                        <span>Go to Main Dashboard</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* User Profile & Actions Bar */}
          <div className="flex items-center gap-2.5 shrink-0 animate-fade-in">
            {isUnlocked ? (
              <div className="flex items-center gap-2.5">
                {/* Admin Console shortcut link */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminPanel(!showAdminPanel);
                      selectTool(null);
                      setDropdownOpen(false);
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                      showAdminPanel 
                        ? 'bg-amber-50 border-amber-200 text-amber-800' 
                        : 'bg-slate-900 border-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{showAdminPanel ? 'Exit Admin' : 'Admin Panel'}</span>
                    <span className="md:hidden">Admin</span>
                  </button>
                )}

                {/* Logged in Email Info and logout */}
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-800 tracking-tight">{sessionEmail}</span>
                  <span className="text-[9px] text-emerald-600 font-medium">Security Verified</span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-rose-600 border border-gray-200/60 rounded-xl transition cursor-pointer"
                  title="Disconnect and Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-mono text-gray-450 bg-gray-50 border border-gray-150 rounded-lg px-2 py-1 flex items-center gap-1.5">
                <Globe className="h-3 w-3 text-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Secure Sandbox</span>
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
