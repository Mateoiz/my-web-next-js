"use client";

import { useState, useEffect } from "react";
import { createPost, storage } from "@/lib/db"; 
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, Image as ImageIcon, Layout, Send, Loader2, X, Eye, FileText
} from "lucide-react";

// --- DYNAMIC IMPORT ---
const TiptapEditor = dynamic(
  () => import("../../components/TiptapEditor").then((mod) => mod.TiptapEditor), 
  { 
    ssr: false, 
    loading: () => (
      <div className="h-64 flex items-center justify-center text-zinc-500 italic animate-pulse border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
        Initializing Writing Engine...
      </div>
    ),
  }
);

export default function CreatePost() {
  const { user } = useAuth();
  const router = useRouter();

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState(""); 
  const [category, setCategory] = useState("Technology"); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false); 

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // --- LOGIC ---
  const handleSubmit = async () => {
    if (!title || !content) return alert("Article requires a Title and Content.");
    
    setIsSubmitting(true);
    try {
      const slug = title.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-') + "-" + Date.now();

      await createPost({
        title, content, excerpt, category, coverImage, 
        author: user?.displayName || "Editor",
        authorId: user?.uid || "unknown",
        slug: slug,
      });
      
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("File max size is 5MB.");

    setIsUploadingImage(true);
    try {
        const safeName = title ? title.slice(0, 20).replace(/\s+/g, '-') : 'untitled';
        const storageRef = ref(storage, `posts/${safeName}-${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        setCoverImage(url);
    } catch (error) {
        console.error(error);
        alert("Image upload failed.");
    } finally {
        setIsUploadingImage(false);
    }
  };

  if (!user) return null;

  return (
    // MAIN CONTAINER with padding adjustment for mobile header
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 font-sans transition-colors duration-300 selection:bg-green-500/30 pt-24 md:pt-32 pb-20">
      
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* --- TOOLBAR HEADER --- */}
        {/* Flex-col on mobile, Flex-row on desktop */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6 mb-8 md:mb-12 border-b-2 border-black dark:border-zinc-800 pb-6 sticky top-[80px] md:static bg-white dark:bg-zinc-950 z-30 pt-4 md:pt-0">
            
            <button 
                onClick={() => router.back()} 
                className="group flex items-center text-black dark:text-zinc-400 hover:text-green-600 dark:hover:text-white transition-colors text-xs md:text-sm font-bold uppercase tracking-wide"
            >
                <div className="p-1.5 md:p-2 bg-zinc-100 dark:bg-zinc-900 rounded-full mr-2 md:mr-3 group-hover:bg-black group-hover:text-white transition-colors border border-zinc-200 dark:border-zinc-800">
                    <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                </div>
                Return to Dashboard
            </button>

            <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end">
                <span className="hidden sm:inline-flex items-center px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold bg-zinc-100 text-black dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-800 uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
                    Draft Mode
                </span>
                <button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || isUploadingImage}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black text-xs md:text-sm px-4 py-2.5 md:px-6 md:py-3 rounded-lg font-bold transition-all disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:shadow-none"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            Publish <span className="hidden sm:inline">Transmission</span> <Send className="w-3 h-3 ml-1" />
                        </>
                    )}
                </button>
            </div>
        </div>

        {/* --- MAIN GRID LAYOUT --- */}
        {/* Stack columns on mobile (grid-cols-1), side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN: WRITING AREA (8 cols) */}
            <div className="lg:col-span-8 space-y-6 md:space-y-8 order-2 lg:order-1">
            
                {/* Cover Image Preview (Hero Style) */}
                {coverImage && (
                    <div className="relative w-full h-48 md:h-96 rounded-xl overflow-hidden group border-2 border-black dark:border-zinc-800 shadow-sm">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => setCoverImage(null)}
                        className="absolute top-4 right-4 bg-black text-white hover:bg-red-600 p-2 rounded-full transition-all shadow-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    </div>
                )}

                {/* Title Input */}
                <div className="space-y-2">
                    <textarea 
                    placeholder="Enter Headline..."
                    rows={1}
                    className="w-full bg-transparent text-4xl sm:text-5xl md:text-7xl font-black text-black dark:text-white placeholder-zinc-300 dark:placeholder-zinc-800 outline-none resize-none overflow-hidden leading-tight tracking-tight"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    />
                </div>

                {/* EDITOR CONTAINER */}
                {/* Min-height reduced for mobile feel */}
                <div className="min-h-[400px] md:min-h-[600px] border-2 border-black dark:border-zinc-800 rounded-xl p-4 md:p-10 bg-white dark:bg-zinc-900/50 shadow-sm">
                    <div className="prose prose-base md:prose-lg prose-zinc max-w-none text-black dark:text-zinc-300 dark:prose-invert prose-headings:font-black prose-p:leading-relaxed prose-a:text-green-600 hover:prose-a:text-green-500">
                        <TiptapEditor content={content} onChange={setContent} />
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: PREVIEW & SETTINGS (4 cols) */}
            {/* On mobile, this stacks BELOW the editor (order-1 to appear first? Usually settings below content is better for writing flow, or use a toggle. Here I'll keep it below by default on mobile or above if you prefer.) */}
            {/* Let's keep it order-1 on mobile so they can set cover image first, or order-3. Actually, putting it at the bottom (order-3) is better for focus. */}
            <aside className="lg:col-span-4 space-y-8 order-1 lg:order-2">
            
                {/* --- SETTINGS PANEL --- */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 border-2 border-black dark:border-zinc-800 rounded-xl p-5 md:p-6 shadow-sm">
                    
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-black/10 dark:border-white/10">
                        <Layout className="w-4 h-4 text-black dark:text-zinc-400" />
                        <h3 className="font-bold text-black dark:text-zinc-100 uppercase tracking-wide text-sm">Post Settings</h3>
                    </div>

                    <div className="space-y-6">
                    
                    {/* Cover Image Uploader (If empty) */}
                    {!coverImage && (
                        <div>
                        <label className="text-xs font-bold text-black dark:text-zinc-400 uppercase mb-2 block tracking-wider">Cover Asset</label>
                        <div className="relative w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-zinc-800 transition-all flex flex-col items-center justify-center cursor-pointer group bg-transparent">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            {isUploadingImage ? (
                                <Loader2 className="w-6 h-6 animate-spin text-black dark:text-white" />
                            ) : (
                                <>
                                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                                        <ImageIcon className="w-5 h-5 text-black dark:text-white" />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 group-hover:text-black dark:group-hover:text-white font-bold uppercase tracking-wide">Click to upload</span>
                                </>
                            )}
                        </div>
                        </div>
                    )}

                    {/* Category */}
                    <div>
                        <label className="text-xs font-bold text-black dark:text-zinc-400 uppercase mb-2 block tracking-wider">Category</label>
                        <div className="relative">
                            <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full appearance-none bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-3 text-sm text-black dark:text-zinc-200 focus:border-black dark:focus:border-white outline-none transition-all font-bold cursor-pointer"
                            >
                            <option value="General">General</option>
                            <option value="Technology">Technology</option>
                            <option value="Events">Events</option>
                            <option value="Announcements">Announcements</option>
                            </select>
                            {/* Custom Arrow */}
                            <div className="absolute right-3 top-3.5 pointer-events-none">
                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-black dark:border-t-white"></div>
                            </div>
                        </div>
                    </div>

                    {/* Excerpt */}
                    <div>
                        <label className="text-xs font-bold text-black dark:text-zinc-400 uppercase mb-2 block tracking-wider">Short Summary</label>
                        <textarea 
                            rows={4}
                            placeholder="Write a brief intro..."
                            className="w-full bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-3 text-sm text-black dark:text-zinc-200 focus:border-black dark:focus:border-white outline-none transition-all resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 leading-relaxed"
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-2">
                             <FileText className="w-3 h-3 text-zinc-400" />
                             <p className={`text-[10px] font-bold transition-colors ${excerpt.length > 150 ? "text-red-600" : "text-zinc-400"}`}>
                                {excerpt.length}/150 chars
                             </p>
                        </div>
                    </div>

                    </div>
                </div>

                {/* --- LIVE PREVIEW CARD (Hidden on mobile to save space, or keep at bottom) --- */}
                <div className="hidden lg:block space-y-4">
                    <div className="flex items-center gap-2 text-black dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Live Preview</span>
                    </div>
                    
                    {/* The Card Projection */}
                    <div className="border-2 border-black dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none hover:translate-y-[-2px] transition-transform">
                        {/* Image Area */}
                        <div className="h-40 bg-zinc-100 dark:bg-zinc-800 w-full relative border-b-2 border-black dark:border-zinc-800">
                            {coverImage ? (
                                <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                                    <ImageIcon className="w-8 h-8 opacity-20" />
                                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">No Asset</span>
                                </div>
                            )}
                            <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider border border-white/20">
                                {category}
                            </span>
                        </div>
                        {/* Content Area */}
                        <div className="p-4">
                            <h4 className="font-black text-lg leading-tight mb-2 line-clamp-2 text-black dark:text-white">
                                {title || "Headline Preview"}
                            </h4>
                            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500 font-mono border-t border-zinc-100 dark:border-zinc-800 pt-2">
                                <span className="font-bold text-black dark:text-zinc-300">
                                    {user?.displayName || "Writer"}
                                </span>
                                <span>{new Date().toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </aside>
        </div>
      </div>
    </div>
  );
}