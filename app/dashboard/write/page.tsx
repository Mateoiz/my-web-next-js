'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import TiptapEditor from '../../components/TiptapEditor'; 
import { motion } from 'framer-motion';
import { FaArrowLeft, FaPaperPlane, FaImage } from 'react-icons/fa'; // ✅ Added FaImage
import Link from 'next/link';

// Component Imports (for decoration)
import CircuitCursor from "../../components/CircuitCursor"; 

export default function WritePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(''); // ✅ Added Image State
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard: Redirect if not logged in
  if (!loading && !user) router.push('/login');

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Please fill in both title and content.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create the post object
      const newPost = {
        title: title,
        image: image, // ✅ Save the image URL
        content: content, 
        authorEmail: user?.email,
        authorId: user?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 2. Save to Firestore "posts" collection
      await addDoc(collection(db, "posts"), newPost);

      // 3. Redirect back to dashboard
      router.push('/dashboard');
      
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to publish post. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <section className="min-h-screen py-24 px-4 md:px-8 relative bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-white selection:bg-green-500/30">
      <CircuitCursor />
      
      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* --- HEADER NAVIGATION --- */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-sm text-zinc-400">
            Drafting as <span className="font-semibold text-zinc-900 dark:text-zinc-200">{user?.email}</span>
          </div>
        </div>

        {/* --- MAIN FORM --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-xl"
        >
          <form onSubmit={handlePublish} className="space-y-8">
            
            {/* Title Input */}
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Enter your post title..." 
                className="w-full bg-transparent text-4xl md:text-5xl font-extrabold placeholder-zinc-300 dark:placeholder-zinc-700 border-none outline-none focus:ring-0 p-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* --- IMAGE INSERTION SECTION --- */}
            <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-sm font-bold text-green-600 dark:text-green-500 mb-1">
                Featured Image (Imgur Direct Link)
              </label>
              
              {/* URL Input with Icon */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaImage className="text-zinc-400 group-focus-within:text-green-500 transition-colors" />
                </div>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full pl-10 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  placeholder="e.g., https://i.imgur.com/Hb5gh3.jpg"
                />
              </div>

              {/* Live Preview Box */}
              <div className="relative w-full rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/30 flex flex-col items-center justify-center p-4 min-h-[200px] transition-all overflow-hidden">
                {image ? (
                  <div className="relative w-full flex flex-col items-center animate-fade-in">
                    <div className="relative rounded-lg overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800">
                      <img
                        src={image}
                        alt="Post Preview"
                        className="max-h-[300px] w-auto object-contain bg-zinc-900"
                        onError={(e) => {
                          // Fallback if link is broken
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      {/* Error State (Hidden by default) */}
                      <div className="hidden absolute inset-0 flex items-center justify-center bg-zinc-800 text-red-400 text-sm font-bold p-4 text-center">
                        Invalid Image Link
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-green-600 font-medium bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                      Live Preview Active
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-zinc-400">
                    <div className="bg-zinc-200 dark:bg-zinc-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FaImage className="text-xl opacity-50" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No image selected</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Paste a link ending in <span className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 rounded">.jpg</span> or <span className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1 rounded">.png</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* --- END IMAGE SECTION --- */}

            {/* Rich Text Editor */}
            <div className="min-h-[400px]">
              <TiptapEditor content={content} onChange={(newContent) => setContent(newContent)} />
            </div>

            {/* Action Bar */}
            <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Publishing...' : (
                  <>
                    <FaPaperPlane />
                    Publish Post
                  </>
                )}
              </button>
            </div>

          </form>
        </motion.div>

      </div>
    </section>
  );
}