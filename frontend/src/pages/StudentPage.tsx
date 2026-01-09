import React, { useState, useEffect } from 'react';
import { usePollContext } from '../context/PollContext';
import { usePollTimer } from '../hooks/usePollTimer';
import { useSocket } from '../hooks/useSocket';
import { Sidebar } from '../components/Sidebar';
import { apiService } from '../services/api';
import { Clock, Loader2, Sparkles, CheckCircle } from 'lucide-react';

export function StudentPage() {
  const { currentPoll, submitVote } = usePollContext();
  const { socket, connected } = useSocket();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null); // Confirmed vote
  const [tempSelectedOption, setTempSelectedOption] = useState<string | null>(null); // Staging selection
  
  const [submitting, setSubmitting] = useState(false);
  const [kicked, setKicked] = useState<{ reason?: string } | null>(null);

  const remainingTime = usePollTimer(
    currentPoll?.startTime || null,
    currentPoll?.duration || null
  );

  useEffect(() => {
    const stored = sessionStorage.getItem('studentId');
    const storedName = sessionStorage.getItem('studentName');
    if (stored && storedName) {
      setStudentId(stored);
      setStudentName(storedName);
    }
  }, []);

  useEffect(() => {
    if (socket && studentId && studentName) {
      socket.emit('participant:join', { id: studentId, name: studentName, role: 'student' });
    }
    const kickedHandler = (payload: any) => {
      setKicked(payload || { reason: 'Removed by teacher' });
      // Clear student session so they start fresh on refresh
      sessionStorage.removeItem('studentId');
      sessionStorage.removeItem('studentName');
    };
    socket?.on('participant:kicked', kickedHandler);
    return () => {
      socket?.off('participant:kicked', kickedHandler);
    };
  }, [socket, studentId, studentName]);

  useEffect(() => {
    if (currentPoll && studentId) {
      checkVoteStatus();
    } else if (!currentPoll) {
      // Reset states for new poll
      setHasVoted(false);
      setSelectedOption(null);
      setTempSelectedOption(null);
    }
  }, [currentPoll, studentId]);

  async function checkVoteStatus() {
    if (!currentPoll || !studentId) return;
    try {
      const status = await apiService.checkVoteStatus(currentPoll.id, studentId);
      setHasVoted(status.hasVoted);
      setSelectedOption(status.selectedOption);
    } catch (err) {
      console.error('Failed to check vote status:', err);
    }
  }

  const handleNameSubmit = () => {
    if (!studentName.trim()) {
      alert('Please enter your name');
      return;
    }
    const id = `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setStudentId(id);
    sessionStorage.setItem('studentId', id);
    sessionStorage.setItem('studentName', studentName);
    if (socket) {
      socket.emit('participant:join', { id, name: studentName, role: 'student' });
    }
  };

  // 1. Select option (Stage 1)
  const handleSelectOption = (optionId: string) => {
    if (hasVoted || submitting) return;
    setTempSelectedOption(optionId);
  };

  // 2. Submit vote (Stage 2)
  const handleSubmitVote = async () => {
    if (!currentPoll || !studentId || !tempSelectedOption || hasVoted || submitting) return;
    
    setSubmitting(true);
    try {
      const success = await submitVote(currentPoll.id, studentId, tempSelectedOption);
      if (success) {
        setHasVoted(true);
        setSelectedOption(tempSelectedOption);
      }
    } catch (err) {
      console.error('Vote failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* --- STATE 1: KICKED --- */
  if (kicked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white font-sans text-center">
        <div className="mb-8">
            <span className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                <Sparkles className="w-3 h-3 fill-current" /> INTERVUE POLL
            </span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">You’ve been Kicked out !</h1>
        <p className="text-gray-500 text-sm max-w-lg leading-relaxed">
            Looks like the teacher has removed you from the poll system. Please try again sometime.
        </p>
      </div>
    );
  }

  /* --- STATE 2: ENTER NAME --- */
  if (!studentId) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-2xl flex flex-col items-center text-center">
            <div className="mb-8">
                <span className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-6 py-2 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                    <Sparkles className="w-4 h-4 fill-current" /> INTERVUE POLL
                </span>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight">
                Let’s <span className="font-extrabold">Get Started</span>
            </h1>
            <p className="text-slate-500 text-lg mb-14 max-w-xl leading-relaxed">
                If you’re a student, you’ll be able to <span className="font-bold text-slate-900">submit your answers</span>, participate in live polls, and see how your responses compare with your classmates
            </p>
            <div className="w-full max-w-md text-left">
                <label className="block text-base font-bold text-slate-900 mb-3 ml-1">
                    Enter your Name
                </label>
                <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                    placeholder="Enter Your Name"
                    className="w-full bg-[#F3F4F6] border-none rounded-xl py-4 px-6 text-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-[#6366F1] focus:bg-white transition-all outline-none mb-8"
                />
                <button
                    onClick={handleNameSubmit}
                    className="w-full bg-[#6366F1] hover:bg-[#5558DD] text-white text-lg font-bold py-4 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                    Continue
                </button>
            </div>
        </div>
      </div>
    );
  }

  /* --- STATE 3: WAITING FOR POLL --- */
  if (!currentPoll) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="mb-12">
            <span className="inline-flex items-center gap-2 bg-[#6366F1] text-white px-5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                <Sparkles className="w-3 h-3 fill-current" /> INTERVUE POLL
            </span>
        </div>
        <div className="mb-8">
            <Loader2 className="w-16 h-16 text-[#6366F1] animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Wait for the teacher to ask questions..</h2>
        <div className="fixed right-8 bottom-8 z-50">
            <Sidebar studentId={studentId} studentName={studentName} />
        </div>
      </div>
    );
  }

  /* --- STATE 4: ACTIVE POLL / VOTING --- */
  return (
    <div className="min-h-screen bg-white p-6 font-sans">
        <div className="max-w-3xl mx-auto pt-12">
            {/* Header: Question & Timer */}
            <div className="flex items-center gap-2 mb-4 font-bold text-lg text-gray-900">
                Question 1 <span className="flex items-center text-red-500 text-sm ml-4 font-mono"><Clock className="w-4 h-4 mr-1" /> {Math.ceil(remainingTime)}s</span>
            </div>

            <div className="rounded-xl overflow-hidden shadow-lg border border-gray-100">
                {/* Dark Header */}
                <div className="bg-[#575757] text-white py-5 px-6">
                    <h2 className="font-medium text-lg leading-snug">{currentPoll.question}</h2>
                </div>

                <div className="bg-white p-6 space-y-3">
                    {!hasVoted && currentPoll.isActive && remainingTime > 0 ? (
                        /* --- VOTING MODE --- */
                        <>
                            {currentPoll.options.map((option, idx) => {
                                const isSelected = tempSelectedOption === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => handleSelectOption(option.id)}
                                        disabled={submitting}
                                        className={`w-full group relative flex items-center justify-between rounded-lg p-4 transition-all duration-200 border ${
                                            isSelected 
                                                ? 'bg-white border-[#6366F1] ring-1 ring-[#6366F1] shadow-sm' 
                                                : 'bg-[#F9FAFB] hover:bg-white border-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${
                                                isSelected 
                                                ? 'bg-[#6366F1] text-white' 
                                                : 'bg-white text-[#6366F1] border border-[#6366F1]'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <span className={`font-medium ${isSelected ? 'text-[#6366F1]' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                                {option.text}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                            
                            {/* --- SUBMIT BUTTON --- */}
                            <div className="flex justify-end mt-8 pt-2">
                                <button
                                    onClick={handleSubmitVote}
                                    disabled={!tempSelectedOption || submitting}
                                    className={`px-10 py-3 rounded-full font-bold text-white shadow-md transition-all ${
                                        !tempSelectedOption || submitting
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-[#6366F1] hover:bg-[#5558DD] hover:shadow-lg hover:-translate-y-0.5'
                                    }`}
                                >
                                    {submitting ? 'Sending...' : 'Submit'}
                                </button>
                            </div>
                        </>
                    ) : (
                        /* --- RESULTS / POST-VOTE MODE --- */
                        currentPoll.options.map((opt, idx) => {
                            const isSelected = opt.id === selectedOption;
                            const total = currentPoll.totalVotes || 0;
                            const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                            
                            return (
                                <div key={opt.id} className="relative">
                                    <div className={`flex items-center justify-between rounded-lg border h-14 relative overflow-hidden transition-all ${isSelected ? 'border-[#6366F1] ring-1 ring-[#6366F1]' : 'border-gray-100 bg-gray-50'}`}>
                                        <div className="absolute top-0 left-0 h-full bg-[#6366F1] transition-all duration-500 ease-out opacity-90" style={{ width: `${pct}%` }} />
                                        <div className="relative z-10 flex items-center w-full px-4">
                                            <div className="w-8 h-8 rounded-full bg-white text-[#6366F1] font-bold flex items-center justify-center mr-4 text-sm shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <span className={`font-medium ${pct > 50 ? 'text-white' : 'text-gray-800'}`}>
                                                {opt.text}
                                            </span>
                                            <span className={`ml-auto font-bold ${pct > 90 ? 'text-white' : 'text-gray-800'}`}>
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            {hasVoted && (
                <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-gray-900 font-bold mb-6">
                        Wait for the teacher to ask a new question..
                    </div>
                </div>
            )}
        </div>

        <div className="fixed right-8 bottom-8 z-50">
            <Sidebar studentId={studentId} studentName={studentName} />
        </div>
    </div>
  );
}