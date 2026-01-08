import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  role?: string;
  time: number;
}

interface SidebarProps {
  isTeacher?: boolean;
  studentId?: string | null;
  studentName?: string;
}

export function Sidebar({ isTeacher, studentId, studentName }: SidebarProps) {
  const { socket, connected } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  // Participant State
  const [participants, setParticipants] = useState<Array<{ socketId?: string; id?: string; name: string; role: string }>>([]);

  useEffect(() => {
    if (!socket) return;

    // Chat Listeners
    const chatHandler = (msg: Message) => setMessages((s) => [...s, msg]);
    socket.on('chat:message', chatHandler);

    // Participant Listeners
    const listHandler = (list: any) => setParticipants(list || []);
    socket.on('participant:list', listHandler);

    return () => {
      socket.off('chat:message', chatHandler);
      socket.off('participant:list', listHandler);
    };
  }, [socket]);

  // Chat Actions
  const send = () => {
    if (!socket || !text.trim()) return;
    const payload: any = { text: text.trim() };

    // Explicitly handle identification based on role
    if (isTeacher) {
        payload.senderId = 'teacher';
        payload.senderName = 'Teacher';
        payload.role = 'teacher';
    } else {
        if (studentId) payload.senderId = studentId;
        if (studentName) payload.senderName = studentName;
        payload.role = 'student';
    }

    socket.emit('chat:send', payload);
    setText('');
  };

  // Participant Actions
  const kick = (sockId: string) => {
    if (!socket || !window.confirm('Kick this participant?')) return;
    socket.emit('participant:kick', { targetSocketId: sockId, senderSocketId: socket.id, senderRole: isTeacher ? 'teacher' : 'student' });
  };

  // Minimized State (Floating Button)
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-14 h-14 bg-[#6366F1] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition duration-200"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  // Expanded "Tabbed" State
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-2xl w-80 flex flex-col overflow-hidden h-[500px] animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-100 bg-white">
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-bold transition-colors relative ${
            activeTab === 'chat' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Chat
          {activeTab === 'chat' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#6366F1]" />}
        </button>
        <button 
          onClick={() => setActiveTab('participants')}
          className={`flex-1 py-3 text-sm font-bold transition-colors relative ${
            activeTab === 'participants' ? 'text-black' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Participants
          {activeTab === 'participants' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#6366F1]" />}
        </button>
        {/* Close X */}
        <button onClick={() => setIsOpen(false)} className="px-4 text-gray-400 hover:text-gray-600">
            ✕
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white relative flex flex-col">
        
        {/* === CHAT TAB === */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                {messages.length === 0 && <div className="text-center text-gray-400 text-xs mt-10">No messages yet</div>}
                {messages.map(m => {
                    // Corrected isMe logic
                    const isMe = 
                        (isTeacher && (m.senderId === 'teacher' || m.role === 'teacher')) || 
                        (studentId && m.senderId === studentId);

                    return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] text-gray-400 mb-1 px-1">{m.senderName}</span>
                            <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                                isMe ? 'bg-[#5B4EFF] text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                            }`}>
                                {m.text}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="p-3 border-t border-gray-100 bg-white">
                <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-[#6366F1] transition-colors"
                placeholder="Type here..."
                disabled={!connected}
                />
            </div>
          </div>
        )}

        {/* === PARTICIPANTS TAB === */}
        {activeTab === 'participants' && (
           <div className="h-full overflow-y-auto">
             <table className="w-full text-sm text-left border-collapse">
                <thead className="text-gray-500 font-medium sticky top-0 bg-white shadow-sm z-10">
                    <tr>
                        <th className="px-4 py-3 font-normal text-xs uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 font-normal text-xs uppercase tracking-wider text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {participants.map((p) => (
                    <tr key={p.socketId ?? p.id} className="hover:bg-gray-50 group transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{p.name} {p.role === 'teacher' && <span className="text-xs text-[#6366F1] ml-1">(Host)</span>}</td>
                        <td className="px-4 py-3 text-right">
                            {isTeacher && p.role !== 'teacher' ? (
                                <button onClick={() => kick(p.socketId ?? p.id ?? '')} className="text-[#3B82F6] hover:underline text-xs font-medium">
                                    Kick out
                                </button>
                            ) : (
                                <span className="text-gray-300 text-xs">-</span>
                            )}
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
           </div>
        )}
      </div>
    </div>
  );
}