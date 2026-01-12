"use client";

import { useState, useEffect } from "react";
import TiptapEditor from "../../components/TiptapEditor"; 
import { createPost, storage } from "@/lib/db"; // 👈 Added storage import
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; // 👈 Firebase Storage imports

// Icons
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  Layout,
  Send,
  Cpu,
  Loader2 // Added loader icon
} from "lucide-react";

// --- COMPONENT IMPORTS ---
import FloatingCubes from "../../components/FloatingCubes"; 
import CircuitCursor from "../../components/CircuitCursor";

export default function CreatePost() {
  const { user, userData } = useAuth();
  const router = useRouter();

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState(""); 
  const [category, setCategory] = useState("General"); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false); // 👈 New state for image loading

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // --- HANDLE SUBMIT ---
  const handleSubmit = async () => {
    if (!title || !content) return alert("Please fill out the title and content.");

    // Permission Check
    if (userData?.role !== 'writer' && userData?.role !== 'admin') {
      return alert("You do not have permission to publish.");
    }

    setIsSubmitting(true);
    try {
      await createPost({
        title,
        content,
        excerpt, 
        category, 
        coverImage, 
        author: user?.displayName || "Officer",
        authorId: user?.uid || "unknown",
        slug: title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-') + "-" + Date.now(),
        status: "pending", 
      });
      
      alert("Post submitted for review!");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Error submitting post. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLE IMAGE UPLOAD (REAL LOGIC) ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return alert("File is too large. Max 5MB allowed.");
    }

    setIsUploadingImage(true);

    try {
        // 2. Create Reference: posts/my-title-123456789.jpg
        // We use a safe filename based on title or date
        const safeName = title 
            ? title.toLowerCase().replace(/\s+/g, '-') 
            : 'untitled';
        const storageRef = ref(storage, `posts/${safeName}-${Date.now()}`);

        // 3. Upload
        const snapshot = await uploadBytes(storageRef, file);

        // 4. Get URL
        const url = await getDownloadURL(snapshot.ref);
        
        setCoverImage(url);
        console.log("Image uploaded:", url);
    } catch (error) {
        console.error("Upload failed", error);
        alert("Failed to upload image. Please try again.");
    } finally {
        setIsUploadingImage(false);
    }
  };

  if (!user) return null;

  return (
    <section className="min-h-screen relative overflow-hidden bg-black text-white">
      
      {/* --- BACKGROUND ELEMENTS --- */}
      <CircuitCursor />
      
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
         <FloatingCubes />
      </div>

      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-green-900/20 to-transparent pointer-events-none z-0" />

      {/* --- CONTENT CONTAINER --- */}
      <div className="container mx-auto px-6 pt-24 pb-24 relative z-10">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4"
        >
          {/* Back Button */}
          <button 
            onClick={() => router.back()}
            className="flex items-center text-zinc-400 hover:text-green-400 transition-colors group mb-4 md:mb-0"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono uppercase text-sm tracking-widest">Abort_Mission // Back</span>
          </button>

          {/* Status & Action */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            <span className="text-zinc-500 font-mono text-xs hidden md:block">
              {isSubmitting ? "UPLOADING_DATA..." : "STATUS :: DRAFT_MODE"}
            </span>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={isSubmitting || isUploadingImage}
              className="flex items-center justify-center bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
            >
              {isSubmitting ? (
                <span className="animate-pulse flex items-center gap-2">
                   <Loader2 className="animate-spin w-4 h-4" /> Transmitting...
                </span>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Protocol
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
          {/* LEFT COLUMN - MAIN EDITOR */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            
            {/* Title Input Card */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="flex items-center gap-2 mb-4">
                 <span className="text-[10px] font-mono text-green-500 tracking-widest uppercase border border-green-500/30 px-2 py-0.5 rounded">
                    Input_01 :: Header
                 </span>
              </div>
              
              <input 
                type="text" 
                placeholder="Enter Article Title..."
                className="w-full bg-transparent border-none text-4xl md:text-5xl font-bold text-white placeholder-zinc-700 focus:outline-none focus:ring-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Tiptap Editor Container */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden min-h-[600px] flex flex-col relative">
               <div className="absolute top-0 right-0 p-4 z-10">
                  <Cpu className="w-5 h-5 text-zinc-700" />
               </div>
               {/* We pass a class to ensure text is white inside the editor */}
               <div className="p-6 flex-1 text-zinc-300">
                  <TiptapEditor content={content} onChange={setContent} />
               </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN - SIDEBAR SETTINGS */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            
            {/* Settings Card */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/50 pb-4">
                <Layout className="w-5 h-5 text-green-500" />
                <span className="font-bold text-lg">Configuration</span>
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  Target_Category
                </label>
                <div className="relative">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all appearance-none"
                  >
                    <option value="General">General</option>
                    <option value="Technology">Technology</option>
                    <option value="Events">Events</option>
                    <option value="Announcements">Announcements</option>
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Excerpt */}
              <div className="mb-2">
                <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  Data_Summary
                </label>
                <textarea 
                  rows={4}
                  placeholder="Brief briefing for the index..."
                  className="w-full bg-black/50 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none transition-all"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>
            </div>

            {/* Media Card */}
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/50 pb-4">
                <ImageIcon className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-lg">Visual_Assets</span>
              </div>

              <label className="block text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
                Cover_Image
              </label>
              
              <div className="relative w-full h-48 bg-black/50 border-2 border-dashed border-zinc-700 rounded-xl hover:border-green-500/50 transition-colors flex flex-col items-center justify-center text-zinc-500 cursor-pointer overflow-hidden group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                
                {isUploadingImage ? (
                   <div className="flex flex-col items-center animate-pulse">
                      <Loader2 className="w-8 h-8 animate-spin text-green-500 mb-2"/>
                      <span className="text-xs text-green-500">UPLOADING...</span>
                   </div>
                ) : coverImage ? (
                  <div className="relative w-full h-full group">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="text-white text-xs font-bold">CLICK TO REPLACE</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center group-hover:scale-105 transition-transform duration-300">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 group-hover:bg-zinc-700">
                      <Upload className="w-5 h-5 group-hover:text-green-400 transition-colors" />
                    </div>
                    <span className="text-xs font-mono group-hover:text-zinc-300">INITIATE UPLOAD</span>
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        </main>
      </div>

      {/* Global CSS for Scanline (matches Dashboard) */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }
      `}</style>
    </section>
  );
}