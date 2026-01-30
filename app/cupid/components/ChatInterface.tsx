"use client";
import { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaInstagram, FaFacebook, FaPaperPlane, FaArrowLeft, FaInfoCircle } from "react-icons/fa";
import { UserProfile, ChatMessage } from "../types";

interface ChatInterfaceProps {
  match: UserProfile | null;
  currentUser: UserProfile | null;
  messages: ChatMessage[];
  quest: string;
  newMessage: string; 
  setNewMessage: (v: string) => void;
  onSendMessage: () => void;
  onBack: () => void; // CHANGED: Replaced onLogout with onBack
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export const ChatInterface = ({ match, currentUser, messages, quest, newMessage, setNewMessage, onSendMessage, onBack, messagesEndRef }: ChatInterfaceProps) => {
  if (!match) return null;

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }} 
      className="max-w-md mx-auto w-full relative z-50 h-[85vh] flex flex-col"
    >
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative flex-1 flex flex-col backdrop-blur-xl">
        
        {/* --- HEADER --- */}
        <div className="p-4 border-b border-zinc-800/50 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md z-10 shadow-sm">
           {/* BACK BUTTON */}
           <button 
             onClick={onBack} 
             className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
           >
             <FaArrowLeft />
           </button>
           
           <div className="relative">
             <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-zinc-800">
               <img src={match.imgs[0] || ""} className="w-full h-full object-cover" />
             </div>
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900"></div>
           </div>

           <div className="flex-1">
             <h3 className="text-white font-bold text-sm flex items-center gap-2">
               {match.name} 
               {match.isBot && <FaRobot className="text-rose-500 text-xs"/>}
             </h3>
             <p className="text-[10px] text-green-400 font-medium flex items-center gap-1">
               Active Now
             </p>
           </div>
        </div>

        {/* --- MESSAGES AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700/50 scrollbar-track-transparent">
           
           {/* QUEST CARD */}
           <motion.div 
             initial={{ y: 20, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             className="bg-gradient-to-br from-rose-500/10 to-purple-500/10 p-5 rounded-2xl border border-rose-500/20 text-center mx-2 mt-2"
           >
              <div className="inline-flex items-center gap-2 text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 bg-rose-500/10 px-3 py-1 rounded-full">
                <FaInfoCircle /> Daily Quest
              </div>
              <p className="text-zinc-200 text-sm font-medium italic leading-relaxed">"{quest}"</p>
           </motion.div>

           {/* SOCIALS */}
           {(match.instagram || match.facebook) && (
             <div className="flex justify-center gap-3 py-2 opacity-80 hover:opacity-100 transition-opacity">
                {match.instagram && (
                  <a href={`https://instagram.com/${match.instagram.replace('@','')}`} target="_blank" className="flex items-center gap-2 text-[10px] font-bold bg-zinc-800 text-pink-400 px-3 py-1.5 rounded-full border border-pink-500/20 hover:bg-zinc-700 transition-colors">
                    <FaInstagram size={14} /> Instagram
                  </a>
                )}
                {match.facebook && (
                  <a href={match.facebook} target="_blank" className="flex items-center gap-2 text-[10px] font-bold bg-zinc-800 text-blue-400 px-3 py-1.5 rounded-full border border-blue-500/20 hover:bg-zinc-700 transition-colors">
                    <FaFacebook size={14} /> Facebook
                  </a>
                )}
             </div>
           )}

           {/* MESSAGES */}
           <AnimatePresence initial={false}>
             {messages.map((msg) => { 
               const isMe = msg.senderId === currentUser?.id; 
               return ( 
                 <motion.div 
                   key={msg.id} 
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   transition={{ duration: 0.2 }}
                   className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                 >
                   <div className={`max-w-[75%] px-4 py-3 text-sm shadow-sm ${
                     isMe 
                       ? 'bg-rose-600 text-white rounded-2xl rounded-tr-sm' 
                       : 'bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm border border-zinc-700/50'
                   }`}>
                     {msg.text}
                   </div>
                 </motion.div> 
               ); 
             })}
           </AnimatePresence>
           <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* --- INPUT --- */}
        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800/50 backdrop-blur-md">
           <div className="relative flex items-center gap-2">
              <input 
                type="text" 
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-full py-3.5 pl-5 pr-12 text-white text-sm placeholder:text-zinc-600 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all shadow-inner" 
                placeholder="Type a message..." 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && onSendMessage()} 
              />
              <button 
                onClick={onSendMessage} 
                disabled={!newMessage.trim()}
                className="absolute right-2 w-9 h-9 bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-600/20 hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
              >
                <FaPaperPlane size={14} className="-ml-0.5 mt-0.5" />
              </button>
           </div>
        </div>
      </div>
    </motion.div>
  );
};