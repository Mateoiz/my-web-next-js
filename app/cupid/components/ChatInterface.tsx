"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPaperPlane, FaTimes, FaStepForward, FaExclamationTriangle, FaInfoCircle, FaInstagram, FaFacebook } from "react-icons/fa";
import { UserProfile, ChatMessage } from "../types";

const INPUT_STYLE = "flex-1 bg-zinc-100 dark:bg-zinc-800 border-0 rounded-full px-6 py-4 outline-none text-zinc-900 dark:text-white font-medium placeholder:text-zinc-400 focus:ring-2 focus:ring-rose-500 transition-all";

interface ChatInterfaceProps {
  match: UserProfile | null;
  currentUser: UserProfile | null;
  messages: ChatMessage[];
  quest: string;
  newMessage: string;
  setNewMessage: (s: string) => void;
  onSendMessage: () => void;
  onStop: () => void; 
  onNext: () => void; 
  messagesEndRef: any;
  isPartnerDisconnected?: boolean;
}

export const ChatInterface = ({ match, currentUser, messages, newMessage, setNewMessage, onSendMessage, onStop, onNext, messagesEndRef, isPartnerDisconnected }: ChatInterfaceProps) => {
  const [showProfile, setShowProfile] = useState(false);

  // Auto-scroll on new message
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Handle "Enter" key
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') onSendMessage(); };

  return (
    <>
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-[60] bg-zinc-50 dark:bg-black flex flex-col md:relative md:h-[80vh] md:w-full md:max-w-4xl md:mx-auto md:rounded-3xl md:overflow-hidden md:border md:border-zinc-200 md:dark:border-zinc-800 md:shadow-2xl">
      
      {/* HEADER */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center z-10 shadow-sm">
        
        {/* CLICKABLE USER INFO */}
        <div 
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2 -ml-2 rounded-xl transition-colors group"
        >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 relative ring-2 ring-transparent group-hover:ring-rose-500 transition-all">
                {match?.imgs?.[0] ? <img src={match.imgs[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-rose-500" />}
            </div>
            <div>
                <h3 className="font-black text-lg leading-none text-zinc-900 dark:text-white flex items-center gap-2">
                    {match?.name?.split(' ')[0] || "Stranger"}
                    <FaInfoCircle className="text-xs text-zinc-400 group-hover:text-rose-500 transition-colors" />
                </h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{match?.course || "Unknown"}</p>
            </div>
        </div>

        <div className="flex gap-2">
            <button onClick={onStop} className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-500 font-bold text-xs uppercase tracking-wide transition-colors">Stop</button>
            <button onClick={onNext} className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-rose-500/20 flex items-center gap-2">
                Next <FaStepForward />
            </button>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-black/50 backdrop-blur-sm">
        {/* Match Info Banner */}
        <div className="text-center py-8 opacity-50">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">You are connected with</p>
            <p className="text-sm font-black text-zinc-500 dark:text-zinc-300 mt-1">{match?.name}</p>
            <div className="flex justify-center gap-2 mt-2">
                {match?.tags?.map(t => <span key={t} className="text-[9px] px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-500">#{t}</span>)}
            </div>
        </div>

        {messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            // System Message (e.g. "Partner disconnected")
            if (msg.senderId === 'system') { 
                return (
                    <div key={msg.id} className="flex justify-center py-2">
                        <span className="text-xs font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">{msg.text}</span>
                    </div>
                );
            }
            return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                        isMe 
                        ? "bg-rose-600 text-white rounded-br-none" 
                        : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 rounded-bl-none"
                    }`}>
                        {msg.text}
                    </div>
                </div>
            );
        })}
        
        {isPartnerDisconnected && (
            <div className="flex flex-col items-center justify-center p-4 my-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                <FaExclamationTriangle className="text-red-500 mb-2" />
                <p className="text-sm font-bold text-red-600 dark:text-red-400">Partner has disconnected.</p>
                <button onClick={onNext} className="mt-3 px-6 py-2 bg-red-600 text-white font-bold rounded-full text-xs hover:bg-red-500 transition-colors">FIND NEW PARTNER</button>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-20">
        <div className="flex gap-2 max-w-4xl mx-auto">
            <input 
                type="text" 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={handleKeyDown}
                disabled={!!isPartnerDisconnected}
                placeholder={isPartnerDisconnected ? "Chat ended." : "Type a message..."} 
                className={INPUT_STYLE}
            />
            <button 
                onClick={onSendMessage} 
                disabled={!newMessage.trim() || !!isPartnerDisconnected}
                className="w-14 h-14 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
            >
                <FaPaperPlane />
            </button>
        </div>
      </div>
    </motion.div>

    {/* --- PROFILE INFO MODAL --- */}
    <AnimatePresence>
        {showProfile && match && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowProfile(false)}>
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative border border-zinc-200 dark:border-zinc-800"
                >
                    {/* Cover / Avatar Area */}
                    <div className="h-32 bg-gradient-to-r from-rose-500 to-purple-600 relative">
                        <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors"><FaTimes /></button>
                    </div>
                    <div className="px-6 pb-6 relative">
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-900 overflow-hidden absolute -top-12 bg-zinc-200">
                             {match.imgs?.[0] ? <img src={match.imgs[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-rose-500" />}
                        </div>
                        
                        <div className="mt-14">
                            <h2 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                {match.name} <span className="text-sm font-normal text-zinc-500">({match.age})</span>
                            </h2>
                            <p className="text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider mb-4">{match.course}</p>
                            
                            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-xl mb-6">
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 italic">"{match.bio || "No bio yet."}"</p>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {match.tags?.map(tag => (
                                    <span key={tag} className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold">#{tag}</span>
                                ))}
                            </div>

                            {/* Social Links */}
                            <div className="grid grid-cols-2 gap-3">
                                {match.instagram && (
                                    <a href={match.instagram.includes('http') ? match.instagram : `https://instagram.com/${match.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 font-bold text-xs hover:brightness-110 transition-all">
                                        <FaInstagram size={16} /> Instagram
                                    </a>
                                )}
                                {match.facebook && (
                                    <a href={match.facebook.includes('http') ? match.facebook : `https://facebook.com/${match.facebook}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs hover:brightness-110 transition-all">
                                        <FaFacebook size={16} /> Facebook
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
    </>
  );
};