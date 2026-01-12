"use client";

import { useState, useEffect } from "react";
import { createPost, storage } from "@/lib/db"; 
import { useAuth } from "../../context/AuthContext"; // Check your import path for context
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import dynamic from "next/dynamic"; // 👈 IMPORT DYNAMIC

// Icons
import { 
  ArrowLeft, Upload, Image as ImageIcon, Layout, Send, Loader2 
} from "lucide-react";

// --- DYNAMICALLY IMPORT TIPTAP TO FIX BUILD ERRORS ---
// ✅ FIXED (Explicitly grabs the default export)
// app/dashboard/create/page.tsx

// ... other imports

const TiptapEditor = dynamic(
  () => import("../../components/TiptapEditor").then((mod) => mod.TiptapEditor), 
  { 
    ssr: false, 
    loading: () => (
      <div className="h-64 flex items-center justify-center text-zinc-500 border border-zinc-800 rounded-2xl">
        Loading Editor...
      </div>
    ),
  }
);

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
  const [isUploadingImage, setIsUploadingImage] = useState(false); 

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // --- HANDLE SUBMIT ---
  const handleSubmit = async () => {
    if (!title || !content) return alert("Please fill out the title and content.");

    setIsSubmitting(true);
    try {
      // 1. Generate a Slug
      const slug = title.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-') + "-" + Date.now();

      // 2. Create Post
      await createPost({
        title,
        content,
        excerpt, 
        category, 
        coverImage, 
        author: user?.displayName || "Officer",
        authorId: user?.uid || "unknown",
        slug: slug,
        // Status and createdAt are handled by db.ts
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

  // --- HANDLE IMAGE UPLOAD ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) return alert("File is too large. Max 5MB.");

    setIsUploadingImage(true);
    try {
        const safeName = title ? title.toLowerCase().replace(/\s+/g, '-') : 'untitled';
        const storageRef = ref(storage, `posts/${safeName}-${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        
        setCoverImage(url);
    } catch (error) {
        console.error("Upload failed", error);
        alert("Failed to upload image.");
    } finally {
        setIsUploadingImage(false);
    }
  };

  if (!user) return null;

  return (
    <section className="min-h-screen bg-black text-white p-6 pt-24">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <button onClick={() => router.back()} className="flex items-center text-zinc-400 hover:text-green-400 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-mono uppercase text-sm">Back</span>
          </button>

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || isUploadingImage}
            className="flex items-center bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Submit</>}
          </button>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
          {/* LEFT: EDITOR */}
          <div className="lg:col-span-2 space-y-6">
            <input 
              type="text" 
              placeholder="Enter Article Title..."
              className="w-full bg-transparent border-none text-5xl font-bold text-white placeholder-zinc-700 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-[500px] text-zinc-300 p-4">
               <TiptapEditor content={content} onChange={setContent} />
            </div>
          </div>

          {/* RIGHT: SETTINGS */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Layout className="w-5 h-5 text-green-500" />
                <span className="font-bold">Settings</span>
              </div>
              
              {/* Category Select */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-zinc-500 mb-2">CATEGORY</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300"
                >
                  <option>General</option>
                  <option>Technology</option>
                  <option>Events</option>
                </select>
              </div>

              {/* Excerpt */}
              <div className="mb-4">
                <label className="block text-xs font-mono text-zinc-500 mb-2">SUMMARY</label>
                <textarea 
                  rows={3}
                  className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-mono text-zinc-500 mb-2">COVER IMAGE</label>
                <div className="relative w-full h-40 bg-black border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center overflow-hidden">
                   <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                   {isUploadingImage ? (
                      <Loader2 className="animate-spin text-green-500"/>
                   ) : coverImage ? (
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                   ) : (
                      <div className="text-center text-zinc-500">
                        <ImageIcon className="w-6 h-6 mx-auto mb-2" />
                        <span className="text-xs">Upload</span>
                      </div>
                   )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </section>
  );
}