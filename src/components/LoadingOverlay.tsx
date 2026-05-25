import React from 'react';
import { motion } from 'motion/react';
import { Layers, ShieldCheck } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
  fullscreen?: boolean;
  key?: string;
}

export default function LoadingOverlay({
  message = "Loading Workspace",
  submessage = "Securing offline sandbox compiler",
  fullscreen = true,
}: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center bg-gray-50/98 dark:bg-slate-950/98 backdrop-blur-xs z-50 ${
        fullscreen ? 'fixed inset-0 w-screen h-screen' : 'absolute inset-0 w-full h-full rounded-2xl'
      }`}
      id="loading-overlay"
    >
      <div className="flex flex-col items-center text-center max-w-sm px-6">
        
        {/* Animated Outer Pulsing Rings around Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Pulsing ring 1 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeOut",
            }}
            className="absolute w-20 h-20 rounded-2xl bg-rose-500/20"
          />
          {/* Pulsing ring 2 */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{
              repeat: Infinity,
              duration: 2,
              delay: 0.6,
              ease: "easeOut",
            }}
            className="absolute w-20 h-20 rounded-2xl bg-rose-500/10"
          />
          
          {/* Floating Ring Orb */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              repeat: Infinity,
              duration: 3,
              ease: "linear"
            }}
            className="absolute w-24 h-24 rounded-full border-2 border-dashed border-rose-300/60 dark:border-rose-400/40"
          />

          {/* Actual Branding Logo Container */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: "easeInOut"
            }}
            className="relative z-10 bg-rose-600 text-white p-4.5 rounded-2xl shadow-xl shadow-rose-600/20 flex items-center justify-center"
          >
            <Layers className="h-10 w-10 text-white" />
          </motion.div>
        </div>

        {/* Text Area */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-mono text-[10px] tracking-wider uppercase text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-full px-2.5 py-0.5 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-rose-600 dark:text-rose-400" />
              <span>DPLK Engine</span>
            </span>
          </div>

          <h2 className="text-xl font-bold font-sans text-gray-900 dark:text-white tracking-tight leading-tight">
            {message}
          </h2>

          <p className="text-gray-400 dark:text-slate-400 text-xs font-sans max-w-xs leading-relaxed">
            {submessage}
          </p>
        </motion.div>

        {/* Modern Accent Progress Bar */}
        <div className="w-40 h-1 bg-gray-200/80 dark:bg-slate-800 rounded-full overflow-hidden mt-6 relative">
          <motion.div
            initial={{ left: "-40%" }}
            animate={{ left: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut"
            }}
            className="absolute top-0 bottom-0 w-2/5 bg-gradient-to-r from-rose-500 to-rose-600 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
