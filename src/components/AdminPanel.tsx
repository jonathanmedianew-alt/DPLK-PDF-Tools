import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle2, Trash2, Search, ArrowLeft, Mail, 
  Clock, ShieldAlert, Check, X, Wifi, AlertTriangle
} from 'lucide-react';
import { AccessRequest } from '../types';
import { fetchCloudRequests, writeCloudRequests } from '../lib/syncService';

interface AdminPanelProps {
  onBack: () => void;
  onRefreshSiteAccess: () => void;
}

export default function AdminPanel({ onBack, onRefreshSiteAccess }: AdminPanelProps) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting'>('connecting');

  // Load and load data in realtime (every 3 seconds)
  const syncData = async () => {
    try {
      const cloudData = await fetchCloudRequests();
      setRequests(cloudData);
      setSyncStatus('synced');
    } catch (e) {
      setSyncStatus('connecting');
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 3000);
    return () => clearInterval(interval);
  }, []);

  const saveList = async (updated: AccessRequest[], successMsg: string) => {
    setRequests(updated);
    setSyncStatus('connecting');
    const success = await writeCloudRequests(updated);
    if (success) {
      setSyncStatus('synced');
      triggerToast(successMsg);
      onRefreshSiteAccess();
    } else {
      triggerToast("Saved locally, connection pending.");
    }
  };

  const handleApprove = async (email: string) => {
    const emailNorm = email.trim().toLowerCase();
    const updated = requests.map(r => 
      r.email === emailNorm ? { ...r, status: 'approved' as const } : r
    );
    await saveList(updated, `Approved access for ${email}`);
  };

  const handleDeny = async (email: string) => {
    const emailNorm = email.trim().toLowerCase();
    // Primary admin cannot be denied/blocked
    if (emailNorm === 'jonathanmedianew@gmail.com') {
      setErrorText('Cannot deny or revoke primary administrator account.');
      return;
    }
    const updated = requests.map(r => 
      r.email === emailNorm ? { ...r, status: 'rejected' as const } : r
    );
    await saveList(updated, `Denied access for ${email}`);
  };

  const handleRemove = async (email: string) => {
    const emailNorm = email.trim().toLowerCase();
    if (emailNorm === 'jonathanmedianew@gmail.com') {
      setErrorText('Cannot remove primary administrator account.');
      return;
    }
    const updated = requests.filter(r => r.email !== emailNorm);
    await saveList(updated, `Removed ${email}`);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailNorm = newEmail.trim().toLowerCase();
    if (!emailNorm) return;

    if (requests.some(r => r.email === emailNorm)) {
      setErrorText('This email already exists in the list.');
      return;
    }

    const newRequest: AccessRequest = {
      email: emailNorm,
      submittedAt: new Date().toISOString(),
      status: 'approved'
    };

    const updated = [newRequest, ...requests];
    setNewEmail('');
    setErrorText(null);
    await saveList(updated, `Instantly whitelisted & approved ${emailNorm}`);
  };

  const triggerToast = (msg: string) => {
    setSuccessText(msg);
    setTimeout(() => setSuccessText(null), 3000);
  };

  // Filter lists based on search query
  const filteredRequests = requests.filter(r => 
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingList = filteredRequests.filter(r => r.status === 'pending');
  const approvedList = filteredRequests.filter(r => r.status === 'approved');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 font-sans" id="simple-admin-panel">
      {/* Top Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg shadow-slate-900/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-rose-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Primary Admin View
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <Wifi className={`h-2.5 w-2.5 ${syncStatus === 'synced' ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
              <span>{syncStatus === 'synced' ? 'Real-time Linked (Netlify Sync)' : 'Connecting cloud...'}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin Console</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            Logged in as <strong className="text-slate-200">jonathanmedianew@gmail.com</strong>.
          </p>
        </div>

        <button 
          type="button"
          onClick={onBack}
          className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs px-4  py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit Console</span>
        </button>
      </div>

      {/* Success alert message overlay */}
      {successText && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 z-50 border border-slate-800 animate-fade-in-up">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{successText}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Register & Sync explanations */}
        <div className="space-y-6">
          
          {/* Quick Whitelist Add */}
          <div className="bg-white border border-gray-250/85 rounded-2xl p-5 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-rose-600" />
              <span>Add Teammate Whitelist</span>
            </h2>

            <form onSubmit={handleAddEmail} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  User Email Address
                </label>
                <input 
                  type="email"
                  required
                  placeholder="colleague@domain.com"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setErrorText(null);
                  }}
                  className="w-full bg-gray-50 border border-gray-250 focus:border-rose-500 focus:bg-white rounded-xl px-3 py-2 text-xs text-gray-850 focus:outline-none transition"
                />
              </div>

              {errorText && (
                <div className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100/50 flex gap-1 items-start">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorText}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs"
              >
                Whitelist & Grant Access
              </button>
            </form>
          </div>

          {/* Quick Guide */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-gray-600">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-widest mb-2.5">Netlify Multi-User Testing</h3>
            <p className="text-xs leading-relaxed mb-2 text-gray-500">
              When a new user visits your Netlify link, they must register their email. 
            </p>
            <p className="text-xs leading-relaxed text-gray-500">
              Their requests will synchronize globally using a secure cloud storage endpoint and show up in your panel here instantly! Simply click <strong className="text-emerald-700">Approve</strong> to give them immediate entry.
            </p>
          </div>

        </div>

        {/* Right Columns: Registry lists */}
        <div className="lg:col-span-2 space-y-6">

          {/* Search filter bar */}
          <div className="bg-white border border-gray-250/85 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-rose-600" />
              <span className="font-bold text-xs text-gray-900 font-sans">Access registry ({requests.length})</span>
            </div>
            
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input 
                type="text"
                placeholder="Search by registered email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-250 focus:border-rose-500 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-850 focus:outline-none transition"
              />
            </div>
          </div>

          {/* 1. Pending registers card list */}
          <div className="bg-white border border-gray-250/85 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending Requests list ({pendingList.length})</span>
            </h2>

            {pendingList.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs font-medium">No pending requests right now.</p>
                <p className="text-[10px] text-gray-400 mt-0.5">New users requesting access in Netlify will show here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingList.map((user) => (
                  <div key={user.email} className="bg-amber-50/45 border border-amber-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-bold text-amber-950 break-all">{user.email}</p>
                      <p className="text-[10px] text-amber-800 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Submitted {new Date(user.submittedAt).toLocaleDateString()} at {new Date(user.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    </div>

                    <div className="flex gap-1.5 self-end sm:self-center">
                      <button
                        onClick={() => handleApprove(user.email)}
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        <span>Approve Access</span>
                      </button>
                      <button
                        onClick={() => handleDeny(user.email)}
                        type="button"
                        className="bg-gray-100 hover:bg-slate-200 text-gray-700 font-bold text-[11px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <X className="h-3 w-3" />
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Registered & Active Users list */}
          <div className="bg-white border border-gray-250/85 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <span className="h-2 w-2 bg-emerald-500 rounded-full" />
              <span>Approved Registered Users ({approvedList.length})</span>
            </h2>

            {approvedList.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs font-medium">No approved users in the system.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {approvedList.map((user) => {
                  const isPrimaryAdmin = user.email === 'jonathanmedianew@gmail.com';
                  return (
                    <div 
                      key={user.email} 
                      className={`py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        isPrimaryAdmin ? 'bg-amber-50/20 px-3 rounded-xl border border-amber-100/50 my-1' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-gray-850 break-all">{user.email}</span>
                          {isPrimaryAdmin && (
                            <span className="bg-amber-100 text-amber-900 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 tracking-wide uppercase">
                              Primary Master Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3. w-3. Text-emerald-500" />
                          <span>Whitelisted {new Date(user.submittedAt).toLocaleDateString()}</span>
                        </p>
                      </div>

                      {!isPrimaryAdmin && (
                        <button
                          onClick={() => handleRemove(user.email)}
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer self-end sm:self-center"
                          title="Revoke and Delete Access"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
