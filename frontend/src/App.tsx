import React, { useState, useEffect } from 'react';
import { PollProvider } from './context/PollContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { TeacherPage } from './pages/TeacherPage';
import HistoryPage from './pages/HistoryPage';
import PollResultPage from './pages/PollResultPage';
import { StudentPage } from './pages/StudentPage';
import { Sparkles } from 'lucide-react';

function App() {
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Recover user role from sessionStorage on mount
  // sessionStorage is tab-specific - each new tab is a new user
  useEffect(() => {
    const savedRole = sessionStorage.getItem('userRole') as 'teacher' | 'student' | null;
    if (savedRole) {
      setRole(savedRole);
    }
    setIsLoading(false);
  }, []);

  // Save role to sessionStorage whenever it changes
  // Only persists for the current tab
  const handleSetRole = (newRole: 'teacher' | 'student') => {
    sessionStorage.setItem('userRole', newRole);
    setRole(newRole);
  };

  const [teacherView, setTeacherView] = useState<'main' | 'history' | 'result'>('main');
  const [openPollId, setOpenPollId] = useState<string | number | null>(null);

  // Save teacher view state to sessionStorage whenever it changes
  useEffect(() => {
    if (role === 'teacher') {
      sessionStorage.setItem('teacherView', teacherView);
      if (openPollId !== null) {
        sessionStorage.setItem('openPollId', String(openPollId));
      } else {
        sessionStorage.removeItem('openPollId');
      }
    }
  }, [teacherView, openPollId, role]);

  // Initialize teacher view from sessionStorage on mount
  useEffect(() => {
    if (role === 'teacher') {
      const savedTeacherView = sessionStorage.getItem('teacherView') as 'main' | 'history' | 'result' | null;
      const savedPollId = sessionStorage.getItem('openPollId');
      
      if (savedTeacherView) {
        setTeacherView(savedTeacherView);
      }
      if (savedPollId) {
        setOpenPollId(savedPollId);
      }
    }
  }, [role]);

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center" />;
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center pt-24 px-6 font-sans">
        {/* Badge */}
        <div className="mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1 bg-[#6366F1] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase shadow-md">
                <Sparkles className="w-3 h-3" /> Intervue Poll
            </span>
        </div>

        {/* Heading */}
        <div className="text-center max-w-2xl mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
                Welcome to the <span className="font-extrabold">Live Polling System</span>
            </h1>
            <p className="text-gray-500 text-lg">
                Please select the role that best describes you to begin using the live polling system
            </p>
        </div>

        {/* Card Selection */}
        <div className="flex flex-col md:flex-row gap-6 w-full max-w-4xl mb-12">
            {/* Student Card */}
            <div 
                onClick={() => setSelectedRole('student')}
                className={`flex-1 p-8 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedRole === 'student' 
                    ? 'border-[#3B82F6] shadow-[0_0_0_4px_rgba(59,130,246,0.1)] bg-blue-50/10' 
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
                <h3 className="text-xl font-bold text-gray-900 mb-2">I'm a Student</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Participate in live polls, submit answers, and view results in real-time.
                </p>
            </div>

            {/* Teacher Card */}
            <div 
                onClick={() => setSelectedRole('teacher')}
                className={`flex-1 p-8 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    selectedRole === 'teacher' 
                    ? 'border-[#3B82F6] shadow-[0_0_0_4px_rgba(59,130,246,0.1)] bg-blue-50/10' 
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
            >
                <h3 className="text-xl font-bold text-gray-900 mb-2">I'm a Teacher</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                    Create polls, manage sessions, and monitor student responses live.
                </p>
            </div>
        </div>

        {/* Continue Button */}
        <button
            onClick={() => selectedRole && handleSetRole(selectedRole)}
            disabled={!selectedRole}
            className={`px-16 py-4 rounded-full text-white font-semibold text-lg transition-all shadow-lg ${
                selectedRole 
                ? 'bg-[#6366F1] hover:bg-[#5558DD] hover:shadow-xl transform hover:-translate-y-0.5' 
                : 'bg-gray-300 cursor-not-allowed shadow-none'
            }`}
        >
            Continue
        </button>
      </div>
    );
  }

  const openHistory = () => setTeacherView('history');
  const openResult = (id?: string | number) => {
    setOpenPollId(id ?? null);
    setTeacherView('result');
  };

  return (
    <ToastProvider>
      <PollProvider>
        {role === 'teacher' ? (
          teacherView === 'main' ? (
            <TeacherPage onOpenHistory={openHistory} onOpenResult={openResult} />
          ) : teacherView === 'history' ? (
            <HistoryPage onClose={() => setTeacherView('main')} />
          ) : (
            <PollResultPage pollId={openPollId} onClose={() => setTeacherView('main')} />
          )
        ) : (
          <StudentPage />
        )}
        <ToastContainer />
      </PollProvider>
    </ToastProvider>
  );
}

export default App;