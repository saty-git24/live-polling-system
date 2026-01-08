import React, { useState, useEffect } from 'react';
import { usePollContext } from '../context/PollContext';
import { useSocket } from '../hooks/useSocket';
import { Sidebar } from '../components/Sidebar';
import { Clock, Plus, Eye, Sparkles, X, ChevronDown } from 'lucide-react';
import { apiService } from '../services/api';
import { usePollTimer } from '../hooks/usePollTimer';

export function TeacherPage({ onOpenHistory, onOpenResult }: { onOpenHistory?: () => void; onOpenResult?: (id: string | number) => void }) {
    const { currentPoll, pollHistory, createPoll, loading, endPoll, participants } = usePollContext();
  const { socket, connected } = useSocket();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<Array<{ text: string; correct?: boolean }>>([
    { text: '' },
    { text: '' },
  ]);
  const [duration, setDuration] = useState(60);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const remainingTime = usePollTimer(currentPoll?.startTime ?? null, currentPoll?.duration ?? null);
    const [answeredCount, setAnsweredCount] = useState(0);

  const addOption = () => setOptions((s) => [...s, { text: '' }]);
  const updateOption = (idx: number, value: string) => {
    const copy = [...options];
    copy[idx] = { ...copy[idx], text: value };
    setOptions(copy);
  };
  const setCorrect = (idx: number, val: boolean) => {
    const copy = options.map((o, i) => ({ ...o, correct: i === idx ? val : o.correct }));
    setOptions(copy);
  };

  const handleCreatePoll = async () => {
    const valid = options.map(o => o.text.trim()).filter(Boolean);
    if (!question.trim() || valid.length < 2) return alert('Add a question and at least 2 options');
    try {
      await createPoll(question.trim(), valid, duration);
      setQuestion('');
      setOptions([{ text: '' }, { text: '' }]);
      setDuration(60);
    } catch (err) {
      console.error(err);
      alert('Failed to create poll');
    }
  };

  // Enforce character limit
  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= 100) {
      setQuestion(text);
    }
  };

  useEffect(() => {
    if (socket) {
      socket.emit('participant:join', { id: 'teacher', name: 'Teacher', role: 'teacher' });
    }
  }, [socket]);

    useEffect(() => {
        let mounted = true;
        async function checkAnswers() {
            if (!currentPoll) {
                setAnsweredCount(0);
                return;
            }

            const studentParticipants = (participants || []).filter((p: any) => p.role === 'student');
            if (studentParticipants.length === 0) {
                setAnsweredCount(0);
                return;
            }

            try {
                console.debug('[Teacher] checking answers', { pollId: currentPoll.id, studentParticipants, totalVotes: currentPoll.totalVotes });
                const checks = await Promise.all(studentParticipants.map((p: any) => apiService.checkVoteStatus(currentPoll.id, p.id).catch((e) => {
                    console.warn('[Teacher] checkVoteStatus failed for', p.id, e);
                    return { hasVoted: false };
                })));
                console.debug('[Teacher] checks results', checks);
                const count = checks.reduce((s: number, r: any) => s + (r?.hasVoted ? 1 : 0), 0);
                console.debug('[Teacher] answered count', count, 'studentCount', studentParticipants.length);
                if (mounted) setAnsweredCount(count);
            } catch (err) {
                console.error('[Teacher] error checking answers', err);
                if (mounted) setAnsweredCount(0);
            }
        }

        checkAnswers();

        return () => { mounted = false; };
    }, [currentPoll, participants]);

  return (
    <div className="min-h-screen bg-white text-gray-800 font-sans pb-24 relative">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-6">
        <div className="mb-2">
           <span className="inline-flex items-center gap-1 bg-[#6366F1] text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase shadow-sm">
                <Sparkles className="w-3 h-3" /> Intervue Poll
            </span>
        </div>
        {!currentPoll && (
            <>
                <h1 className="text-4xl font-bold text-black mt-4 mb-2">Let’s <span className="font-extrabold">Get Started</span></h1>
                <p className="text-gray-400 text-sm max-w-xl">
                    you'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.
                </p>
            </>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-6">
        {currentPoll ? (
          /* --- ACTIVE POLL VIEW --- */
          <div className="w-full max-w-3xl mx-auto mt-8">
            <div className="flex items-center gap-2 mb-2 font-bold text-lg">
                Question 1 <span className="flex items-center text-red-500 text-sm ml-4 font-mono"><Clock className="w-4 h-4 mr-1" /> {Math.ceil(remainingTime) < 10 ? `00:0${Math.ceil(remainingTime)}` : `00:${Math.ceil(remainingTime)}`}</span>
            </div>
            
            <div className="rounded-xl overflow-hidden shadow-lg border border-gray-100">
                {/* Dark Header */}
                <div className="bg-[#575757] text-white py-5 px-6">
                    <h2 className="font-medium text-lg leading-snug">{currentPoll.question}</h2>
                </div>

                {/* Live Results */}
                <div className="bg-white p-6 space-y-4">
                    {currentPoll.options.map((opt: any, idx: number) => {
                         const pct = currentPoll.totalVotes > 0 ? Math.round((opt.votes / currentPoll.totalVotes) * 100) : 0;
                         return (
                             <div key={opt.id} className="relative">
                                <div className="flex items-center justify-between bg-gray-50 rounded-lg border border-gray-100 h-14 relative overflow-hidden">
                                     {/* Progress Bar */}
                                     <div 
                                        className="absolute top-0 left-0 h-full bg-[#6366F1] transition-all duration-500 ease-out opacity-90"
                                        style={{ width: `${pct}%` }}
                                     />
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
                    })}
                </div>
            </div>

            <div className="mt-8 text-center text-gray-500 font-medium">
                Wait for the teacher to ask a new question..
            </div>
             
                         <div className="mt-6 flex justify-center gap-4">
                                 {(() => {
                                     const studentCount = participants ? participants.filter((p: any) => p.role === 'student').length : 0;
                                       // enable only when there is at least one connected student AND all have answered
                                       const everyoneAnswered = !!currentPoll && (studentCount > 0) && ((answeredCount ?? 0) >= studentCount);
                                     return (
                                         <button
                                             onClick={async () => {
                                                 if (!currentPoll) return;
                                                 try {
                                                     await endPoll(currentPoll.id);
                                                 } catch (err) {
                                                     console.error(err);
                                                     alert('Failed to end poll');
                                                 }
                                             }}
                                             disabled={!everyoneAnswered}
                                             className={`flex items-center gap-3 px-6 py-3 rounded-full font-medium transition-all shadow-lg ${everyoneAnswered ? 'bg-gradient-to-r from-[#8161F0] to-[#6366F1] text-white hover:from-[#6f4be6] hover:to-[#5558DD]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                         >
                                             <Plus className="w-4 h-4" />
                                             <span className="text-sm"> Ask a new question</span>
                                         </button>
                                     );
                                 })()}
                         </div>
          </div>
        ) : (
          /* --- CREATE POLL FORM --- */
          <div className="bg-white mt-4">
            {/* Header Row: Label + Timer Outside */}
            <div className="flex items-center justify-between mb-3">
                 <div className="font-bold text-gray-900 text-lg">Enter your question</div>
                 
                 {/* Timer Dropdown (Outside) */}
                 <div className="relative">
                   <select 
                        value={duration} 
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="appearance-none bg-[#F3F4F6] text-gray-700 font-medium py-2 pl-4 pr-10 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm focus:outline-none focus:ring-1 focus:ring-[#6366F1]"
                    >
                        <option value={15}>15 seconds</option>
                        <option value={30}>30 seconds</option>
                        <option value={45}>45 seconds</option>
                        <option value={60}>60 seconds</option>
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                 </div>
            </div>
            
            {/* Input Box */}
            <div className="relative mb-10">
                <textarea
                  value={question}
                  onChange={handleQuestionChange}
                  maxLength={100}
                  className="w-full h-32 bg-[#F3F4F6] rounded-xl p-5 resize-none outline-none focus:ring-2 focus:ring-[#6366F1] text-gray-800 placeholder-gray-400 border border-transparent transition-all"
                  placeholder="Type your question here..."
                />
                {/* Character Counter */}
                <div className="absolute right-4 bottom-3 text-xs text-gray-500 font-medium bg-[#F3F4F6] px-1">
                    {question.length}/100
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Options Input */}
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-4">Edit Options</h3>
                    <div className="space-y-4">
                        {options.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#6366F1] flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                                    {idx + 1}
                                </div>
                                <input
                                    value={opt.text}
                                    onChange={(e) => updateOption(idx, e.target.value)}
                                    className="flex-1 bg-[#F3F4F6] py-3 px-4 rounded-lg outline-none focus:ring-1 focus:ring-[#6366F1] transition-all"
                                    placeholder={`Option ${idx + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                    <button onClick={addOption} className="mt-4 px-4 py-2 border border-[#6366F1] text-[#6366F1] rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-50 transition-colors">
                        <Plus className="w-4 h-4" /> Add More option
                    </button>
                </div>

                {/* Correct Answer Selection */}
                <div className="w-full lg:w-64">
                    <h3 className="font-bold text-gray-900 mb-4">Is it Correct?</h3>
                    <div className="space-y-6 mt-2">
                        {options.map((opt, idx) => (
                             <div key={idx} className="flex items-center h-[52px]">
                                <div className="flex gap-6">
                                    <label className="flex items-center cursor-pointer gap-2 select-none">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${opt.correct ? 'border-[#6366F1]' : 'border-gray-300'}`}>
                                            {opt.correct && <div className="w-3 h-3 rounded-full bg-[#6366F1]" />}
                                        </div>
                                        <input type="radio" className="hidden" name={`c-${idx}`} checked={!!opt.correct} onChange={() => setCorrect(idx, true)} />
                                        <span className="text-sm font-medium text-gray-700">Yes</span>
                                    </label>

                                    <label className="flex items-center cursor-pointer gap-2 select-none">
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${!opt.correct ? 'border-[#6366F1]' : 'border-gray-300'}`}>
                                            {!opt.correct && <div className="w-3 h-3 rounded-full bg-[#6366F1]" />}
                                        </div>
                                        <input type="radio" className="hidden" name={`c-${idx}`} checked={!opt.correct} onChange={() => setCorrect(idx, false)} />
                                        <span className="text-sm font-medium text-gray-700">No</span>
                                    </label>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
            
             <div className="mt-12 flex justify-end pb-12">
                <button 
                    onClick={handleCreatePoll}
                    className="bg-[#6366F1] hover:bg-[#5558DD] text-white font-semibold py-3 px-10 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                    Ask Question
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Floating Buttons */}
      <div className="fixed right-8 top-8 z-50">
        <button
            onClick={() => onOpenHistory ? onOpenHistory() : setShowHistoryModal(true)}
            className="flex items-center gap-2 bg-[#6366F1] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg hover:bg-[#5558DD] transition-all"
        >
            <Eye className="w-4 h-4" /> View Poll history
        </button>
      </div>

      <div className="fixed right-8 bottom-8 z-50">
          <Sidebar isTeacher={true} />
      </div>

      {/* Internal History Modal (if onOpenHistory is not used) */}
      {showHistoryModal && (
           <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in fade-in duration-200">
               <div className="max-w-4xl mx-auto px-6 py-12">
                   <div className="flex items-center justify-between mb-10">
                       <h2 className="text-3xl font-bold text-black">
                           View <span className="font-extrabold">Poll History</span>
                       </h2>
                       <button onClick={() => setShowHistoryModal(false)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                           <X className="w-4 h-4 text-gray-600" /> <span className="text-sm font-medium text-gray-600">Close</span>
                       </button>
                   </div>
                   <div className="space-y-8">
                        {pollHistory.length === 0 && <div className="text-center text-gray-400 py-10">No past polls available.</div>}
                        {pollHistory.map((poll, pIdx) => {
                             const total = poll.totalVotes ?? 0;
                             return (
                                 <div key={poll.id}>
                                     <h3 className="text-lg font-bold text-black mb-4">Question {pIdx + 1}</h3>
                                     <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
                                         <div className="bg-[#575757] text-white py-4 px-6 font-medium">
                                             {poll.question}
                                         </div>
                                         <div className="p-6 bg-white space-y-4">
                                             {poll.options?.map((opt: any, idx: number) => {
                                                 const pct = total > 0 ? Math.round(((opt.votes ?? 0) / total) * 100) : 0;
                                                 return (
                                                     <div key={idx} className="relative h-12 flex items-center bg-gray-50 rounded border border-gray-100 overflow-hidden">
                                                         <div className="absolute top-0 left-0 h-full bg-[#6366F1] opacity-90" style={{ width: `${pct}%` }} />
                                                         <div className="relative z-10 flex items-center justify-between w-full px-4">
                                                             <div className="flex items-center gap-4">
                                                                 <div className="w-6 h-6 rounded-full bg-white text-[#6366F1] text-xs font-bold flex items-center justify-center shadow-sm">
                                                                     {idx + 1}
                                                                 </div>
                                                                 <span className={`font-medium ${pct > 50 ? 'text-white' : 'text-gray-800'}`}>{opt.text}</span>
                                                             </div>
                                                             <span className={`font-bold ${pct > 90 ? 'text-white' : 'text-gray-800'}`}>{pct}%</span>
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
      )}
    </div>
  );
}