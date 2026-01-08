import React from 'react';
import { X } from 'lucide-react';
import { usePollContext } from '../context/PollContext';

export default function HistoryPage({ onClose }: { onClose: () => void }) {
  const { pollHistory } = usePollContext();

  return (
    <div className="min-h-screen bg-white p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-black">
            View <span className="font-extrabold">Poll History</span>
          </h2>
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </div>

        {/* Content */}
        <div className="space-y-12">
          {pollHistory.length === 0 && (
              <div className="text-center text-slate-400 py-12 bg-slate-50 rounded-lg">
                  No past polls available
              </div>
          )}
          
          {pollHistory.map((poll, pIdx) => {
            const total = poll.totalVotes ?? (poll.options?.reduce((s: number, o: any) => s + (o.votes ?? 0), 0) ?? 0);
            return (
              <div key={poll.id}>
                <h3 className="text-lg font-bold text-black mb-4">Question {pIdx + 1}</h3>
                
                <div className="rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  {/* Dark Header */}
                  <div className="bg-[#575757] text-white py-4 px-6 font-medium">
                    {poll.question}
                  </div>
                  
                  {/* Body */}
                  <div className="p-6 bg-white space-y-4">
                    {poll.options?.map((opt: any, idx: number) => {
                      const pct = total > 0 ? Math.round(((opt.votes ?? 0) / total) * 100) : 0;
                      return (
                        <div key={opt.id ?? idx} className="relative h-12 flex items-center bg-slate-50 rounded border border-slate-100 overflow-hidden">
                          {/* Progress Bar */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-[#6366F1] opacity-90 transition-all duration-500" 
                            style={{ width: `${pct}%` }} 
                          />
                          
                          {/* Text Layout */}
                          <div className="relative z-10 flex items-center justify-between w-full px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-6 h-6 rounded-full bg-white text-[#6366F1] text-xs font-bold flex items-center justify-center shadow-sm">
                                {idx + 1}
                              </div>
                              <div className={`font-medium ${pct > 50 ? 'text-white' : 'text-slate-800'}`}>
                                {opt.text}
                              </div>
                            </div>
                            <div className={`font-bold ${pct > 90 ? 'text-white' : 'text-slate-800'}`}>
                                {pct}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}