'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Cpu, Clock, HardDrive, FileText } from 'lucide-react';

interface LogMessage {
  time: string;
  message: string;
}

interface GenerationEngineUIProps {
  progress: number;
  status: string;
  logs: LogMessage[];
  startTime: number;
}

export default function GenerationEngineUI({ progress, status, logs, startTime }: GenerationEngineUIProps) {
  const [elapsed, setElapsed] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (progress >= 100) return;
    
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime, progress]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0f16] border border-[#1e293b] rounded-xl overflow-hidden shadow-2xl font-sans my-4 animate-fade-in">
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-[#1e293b]/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 rounded-lg flex items-center justify-center text-teal-400">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg">Resume Generation Engine</h2>
            <p className="text-[#64748b] text-sm">Processing documents & running AI rules</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-[#1e293b] flex items-center justify-center relative">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-[#1e293b]"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              className="text-teal-400 transition-all duration-500"
              strokeDasharray={`${progress}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <span className="text-teal-400 text-xs font-bold">{progress}%</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Progress Bar Area */}
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-white font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full border border-teal-400 border-t-transparent animate-spin"></span>
              {status}
            </span>
            <span className="text-[#64748b]">Engine Running</span>
          </div>
          <div className="h-2 w-full bg-[#1e293b] rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#0f172a]/50 border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[#64748b] text-xs font-medium mb-1 uppercase tracking-wider">
              <Clock size={12} /> Elapsed
            </div>
            <div className="text-white font-semibold text-sm">{elapsed}s</div>
          </div>
          <div className="bg-[#0f172a]/50 border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[#64748b] text-xs font-medium mb-1 uppercase tracking-wider">
              <Clock size={12} /> Remaining
            </div>
            <div className="text-white font-semibold text-sm">--</div>
          </div>
          <div className="bg-[#0f172a]/50 border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[#64748b] text-xs font-medium mb-1 uppercase tracking-wider">
              <HardDrive size={12} /> Processed
            </div>
            <div className="text-white font-semibold text-sm">JSON</div>
          </div>
          <div className="bg-[#0f172a]/50 border border-[#1e293b] rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[#64748b] text-xs font-medium mb-1 uppercase tracking-wider">
              <FileText size={12} /> Files
            </div>
            <div className="text-white font-semibold text-sm">1 / 1</div>
          </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-[#05080c] border border-[#1e293b] rounded-lg overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-[#1e293b]/50 flex items-center gap-2">
            <Terminal size={12} className="text-white" />
            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Engine Output</span>
          </div>
          <div 
            ref={terminalRef}
            className="p-3 h-32 overflow-y-auto font-mono text-xs space-y-1"
          >
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-3 text-[#64748b]">
                <span className="shrink-0">[{log.time}]</span>
                <span className={log.message.includes("error") || log.message.includes("failed") ? "text-red-400" : "text-[#94a3b8]"}>
                  {log.message}
                </span>
              </div>
            ))}
            {progress < 100 && (
              <div className="flex gap-3 text-[#64748b] animate-pulse">
                <span className="shrink-0">[{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className="text-[#94a3b8]">...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
