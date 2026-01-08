import React from 'react';
import { usePollContext } from '../context/PollContext';
import { Clock } from 'lucide-react';

export default function PollResultPage({ pollId, onClose }: { pollId?: string | number | null; onClose?: () => void }) {
  const { currentPoll, pollHistory } = usePollContext();

  const poll = currentPoll && (currentPoll.id === pollId || !pollId) ? currentPoll : pollHistory.find((p) => p.id === pollId);
  if (!poll) return <div className="p-8">No poll found</div>;

  const total = poll.totalVotes ?? (poll.options?.reduce((s: number, o: any) => s + (o.votes ?? 0), 0) ?? 0);

  return (
    <div className="min-h-screen bg-white p-12">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white p-6 rounded shadow-card border border-slate-100">
          <div className="bg-slate-800 text-white py-3 px-4 rounded-t">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{poll.question}</div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <div className="text-sm">{poll.duration ?? ''}s</div>
              </div>
            </div>
          </div>
          <div className="p-4">
            {poll.options.map((opt: any, idx: number) => {
              const pct = total > 0 ? Math.round(((opt.votes ?? 0) / total) * 100) : 0;
              return (
                <div key={opt.id ?? idx} className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold">{idx + 1}</div>
                      <div className="font-medium">{opt.text}</div>
                    </div>
                    <div className="text-sm text-muted">{pct}%</div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-4">
                    <div className="bg-gradient-to-r from-primary to-accent h-4 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-6 text-sm text-muted">Total Votes: {total}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
