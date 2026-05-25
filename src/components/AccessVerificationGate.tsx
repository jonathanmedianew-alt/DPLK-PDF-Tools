import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, Key, Lock, ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { AccessRequest } from '../types';
import { fetchCloudRequests, writeCloudRequests } from '../lib/syncService';

interface AccessVerificationGateProps {
  onSuccess: () => void;
}

export default function AccessVerificationGate({ onSuccess }: AccessVerificationGateProps) {
  const [email, setEmail] = useState('');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  // Sync session and fetch cloud datastore
  useEffect(() => {
    const activeSession = localStorage.getItem('dplk_verified_email');
    if (activeSession) {
      setSessionEmail(activeSession);
    }

    const syncRegistry = async () => {
      const list = await fetchCloudRequests();
      setRequests(list);

      // Check the latest status if user is currently logged in/waiting
      const activeUser = activeSession || email;
      if (activeUser) {
        const req = list.find(r => r.email === activeUser.trim().toLowerCase());
        if (req) {
          setStatus(req.status);
          if (req.status === 'approved') {
            localStorage.setItem('dplk_verified_email', req.email);
            onSuccess();
          }
        }
      }
    };

    syncRegistry();
    const interval = setInterval(syncRegistry, 3000);
    return () => clearInterval(interval);
  }, [email, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setLoading(true);
    setErrorText(null);

    try {
      const currentList = await fetchCloudRequests();
      setRequests(currentList);

      // Auto-approve master admin
      if (cleanEmail === 'jonathanmedianew@gmail.com') {
        let adminReq = currentList.find(r => r.email === cleanEmail);
        let updatedList = [...currentList];
        
        if (!adminReq) {
          adminReq = { email: cleanEmail, submittedAt: new Date().toISOString(), status: 'approved' };
          updatedList.unshift(adminReq);
        } else if (adminReq.status !== 'approved') {
          adminReq.status = 'approved';
        }

        await writeCloudRequests(updatedList);
        localStorage.setItem('dplk_verified_email', cleanEmail);
        setStatus('approved');
        onSuccess();
        setLoading(false);
        return;
      }

      // Check other emails
      const existingReq = currentList.find(r => r.email === cleanEmail);
      if (existingReq) {
        setStatus(existingReq.status);
        localStorage.setItem('dplk_verified_email', cleanEmail);
        setSessionEmail(cleanEmail);
        if (existingReq.status === 'approved') {
          onSuccess();
        }
      } else {
        // Submit access request
        const newReq: AccessRequest = {
          email: cleanEmail,
          submittedAt: new Date().toISOString(),
          status: 'pending'
        };
        const updatedList = [newReq, ...currentList];
        await writeCloudRequests(updatedList);
        setRequests(updatedList);
        setStatus('pending');
        localStorage.setItem('dplk_verified_email', cleanEmail);
        setSessionEmail(cleanEmail);
      }
    } catch (err) {
      setErrorText('Could not submit verification. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('dplk_verified_email');
    setSessionEmail(null);
    setEmail('');
    setStatus('idle');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12" id="verification-gate-container">
      <div className="w-full max-w-md bg-white border border-gray-250/75 rounded-3xl p-8 sm:p-10 shadow-xl shadow-gray-200/50 relative overflow-hidden" id="login-card">
        {/* Subtle decorative glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-2xl" />

        <div className="flex flex-col items-center text-center">
          {/* Top Lock Icon Badge */}
          <div className="h-14 w-14 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mb-6 text-rose-600 shadow-xs relative">
            {status === 'pending' ? (
              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            ) : (
              <Lock className="h-6 w-6" />
            )}
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-rose-500 rounded-full border-2 border-white animate-ping" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            DPLK Tools Workspace
          </h2>
          <p className="text-xs font-mono text-gray-400 tracking-wider mt-1 uppercase flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secure Access Area</span>
          </p>
        </div>

        {/* View state router */}
        {status === 'pending' && sessionEmail ? (
          // Waiting for approval state
          <div className="mt-8 space-y-6" id="state-pending">
            <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-5 text-center">
              <div className="flex justify-center mb-3 text-amber-600">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-amber-900">Access Request Pending</h3>
              <p className="text-xs text-amber-800/80 mt-1.5 leading-relaxed">
                Your email <code className="font-mono bg-white/60 px-1 border border-amber-300/40 rounded text-amber-950 text-[11px] font-bold">{sessionEmail}</code> has been registered in the cloud database.
              </p>
              <p className="text-[11px] text-amber-700 mt-3 font-medium">
                The administrator (Jonathan) will review your request in real-time. This screen unlocks automatically upon approval.
              </p>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 font-bold text-xs py-3 border border-gray-250 rounded-xl transition cursor-pointer"
            >
              Cancel & Use Different Email
            </button>
          </div>
        ) : status === 'rejected' && sessionEmail ? (
          // Rejected Access state
          <div className="mt-8 space-y-6" id="state-rejected">
            <div className="bg-rose-50 border border-rose-200/60 rounded-2xl p-5 text-center">
              <h3 className="text-sm font-bold text-rose-900 flex items-center justify-center gap-1.5">
                Access Denied
              </h3>
              <p className="text-xs text-rose-800/80 mt-1.5 leading-relaxed">
                Your request for <code className="font-mono bg-white/60 px-1 border border-rose-300/40 rounded text-rose-950 font-bold">{sessionEmail}</code> was denied by the security administrator.
              </p>
              <p className="text-[11px] text-rose-750 mt-3">
                Please contact support or register using another corporate address.
              </p>
            </div>

            <button
              onClick={handleLogout}
              type="button"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer"
            >
              Try Different Email
            </button>
          </div>
        ) : (
          // Default: Submit Email Form
          <form onSubmit={handleSubmit} className="mt-8 space-y-5" id="verification-form">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-sans">
                Corporate Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-250 focus:border-rose-500 focus:bg-white rounded-xl pl-11 pr-4 py-3 text-xs text-gray-850 focus:outline-none transition font-sans"
                />
              </div>
            </div>

            {errorText && (
              <p className="text-rose-600 text-xs text-center font-medium bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                {errorText}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition shadow-md shadow-rose-600/10 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting Secure Database...</span>
                </>
              ) : (
                <>
                  <span>Verify Email Identity</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <span className="text-[10px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100 inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-rose-500" />
                <span>Instant Whitelist for jonathanmedianew@gmail.com</span>
              </span>
            </div>
          </form>
        )}
      </div>

      {/* Helpful client safety notice */}
      <p className="text-center text-[10px] text-gray-400 max-w-xs leading-relaxed mt-6">
        All documents handled by DPLK remains securely protected inside your local sandboxed memory.
      </p>
    </div>
  );
}
