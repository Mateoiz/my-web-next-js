"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
// ✅ REMOVED unused 'FaTimes' to fix build error
import { FaLock, FaPaperPlane, FaEdit, FaPlus, FaArrowLeft, FaSignOutAlt } from "react-icons/fa";

import RichTextEditor from "../../components/RichTextEditor";

type ViewState = 'login' | 'dashboard' | 'create' | 'edit_list' | 'edit_form';

export default function AdminPage() {
  const router = useRouter();
  
  // --- STATE ---
  const [view, setView] = useState<ViewState>('login');
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [postsList, setPostsList] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    subtitle: "",
    author: "",
    category: "News",
    image: "", 
    excerpt: "",
    content: "",
  });

  const [loading, setLoading] = useState(false);

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (view === 'login') setView('dashboard');
      } else {
        setUser(null);
        setView('login');
      }
    });
    return () => unsubscribe();
  }, [view]);

  // --- HANDLERS ---
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert("Login failed! Please check your credentials.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('login');
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPostsList(posts);
      setView('edit_list');
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (post: any) => {
    setFormData({
      title: post.title || "",
      slug: post.slug || "",
      subtitle: post.subtitle || "",
      author: post.author || "",
      category: post.category || "News",
      image: post.image || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
    });
    setEditingId(post.id);
    setView('edit_form');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleContentChange = (html: string) => {
    setFormData(prev => ({ ...prev, content: html }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const docRef = doc(db, "posts", editingId);
        await updateDoc(docRef, {
            ...formData,
            updatedAt: serverTimestamp() 
        });
        alert("Post updated successfully!");
      } else {
        await addDoc(collection(db, "posts"), {
          ...formData,
          date: new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
          createdAt: serverTimestamp(),
        });
        alert("Post published successfully!");
      }
      
      setView('dashboard');
      setEditingId(null);
      setFormData({ title: "", slug: "", subtitle: "", author: "", category: "News", image: "", excerpt: "", content: "" });

    } catch (error) {
      console.error("Error saving document: ", error);
      alert("Error saving post.");
    } finally {
      setLoading(false);
    }
  };

  // --- VIEWS ---

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-4">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-zinc-900 p-8 rounded-2xl border border-zinc-800 space-y-4 shadow-2xl">
          <div className="text-center mb-6">
            <FaLock className="mx-auto text-3xl text-green-500 mb-2" />
            <h1 className="text-xl font-bold">Officer Login</h1>
          </div>
          <input type="email" placeholder="Email" required className="w-full p-3 bg-zinc-800 rounded border border-zinc-700 focus:border-green-500 outline-none transition-colors" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="w-full p-3 bg-zinc-800 rounded border border-zinc-700 focus:border-green-500 outline-none transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" className="w-full py-3 bg-green-600 hover:bg-green-500 font-bold rounded transition-transform active:scale-95">Access Dashboard</button>
        </form>
      </div>
    );
  }

  if (view === 'dashboard') {
    const displayName = user?.displayName || user?.email?.split('@')[0] || "Officer";
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-24 px-4 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12 animate-fade-in-up">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">{getGreeting()}, <span className="text-green-600 capitalize">{displayName}</span>.</h1>
            <p className="text-zinc-500">What would you like to do today?</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button onClick={() => { setFormData({ title: "", slug: "", subtitle: "", author: "", category: "News", image: "", excerpt: "", content: "" }); setView('create'); }} className="group p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-green-500/50 transition-all text-left shadow-lg hover:shadow-green-500/10">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 mb-4 group-hover:scale-110 transition-transform"><FaPlus size={24} /></div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Create New Post</h2>
              <p className="text-zinc-500 text-sm">Draft a new article, announcement, or event update.</p>
            </button>
            <button onClick={fetchPosts} className="group p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all text-left shadow-lg hover:shadow-blue-500/10">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform"><FaEdit size={24} /></div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Edit Existing Post</h2>
              <p className="text-zinc-500 text-sm">Update content or fix typos on live posts.</p>
            </button>
          </div>
           <div className="mt-12 text-center">
             <button onClick={handleLogout} className="text-sm text-zinc-500 hover:text-red-500 flex items-center justify-center gap-2 mx-auto transition-colors"><FaSignOutAlt /> Sign Out</button>
           </div>
        </div>
      </main>
    );
  }

  if (view === 'edit_list') {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-zinc-500 hover:text-green-500 mb-8 transition"><FaArrowLeft /> Back to Dashboard</button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">Select a Post to Edit</h1>
          <div className="space-y-4">
            {loading ? <p className="text-zinc-500 text-center py-10">Loading posts...</p> : postsList.map((post) => (
              <div key={post.id} className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-green-500/50 transition-all shadow-sm">
                <div><h3 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{post.title}</h3><p className="text-xs text-zinc-500">{post.date} • {post.author}</p></div>
                <button onClick={() => handleEditClick(post)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-sm font-bold rounded-lg hover:bg-green-600 hover:text-white transition-colors">Edit</button>
              </div>
            ))}
            {postsList.length === 0 && !loading && <div className="text-center py-12 text-zinc-500">No posts found.</div>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-zinc-500 hover:text-green-500 mb-8 transition"><FaArrowLeft /> Cancel & Return</button>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">{editingId ? "Edit Post" : "Create New Update"}</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-zinc-500 mb-1">Title</label><input required name="title" value={formData.title} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 focus:border-green-500 outline-none transition-colors" /></div>
            <div><label className="block text-sm font-medium text-zinc-500 mb-1">Slug</label><input required name="slug" value={formData.slug} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 focus:border-green-500 outline-none transition-colors" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div><label className="block text-sm font-medium text-zinc-500 mb-1">Author</label><input required name="author" value={formData.author} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 focus:border-green-500 outline-none transition-colors" /></div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 focus:border-green-500 outline-none transition-colors">
                <option value="News">News</option><option value="Events">Events</option><option value="Tech">Tech</option><option value="Community">Community</option><option value="Tinig">Tinig</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-zinc-500 mb-1">Subtitle</label><input required name="subtitle" value={formData.subtitle} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 focus:border-green-500 outline-none transition-colors" /></div>
          <div><label className="block text-sm font-bold text-green-600 mb-1">Image Link</label><input required name="image" type="url" value={formData.image} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border-2 border-green-500/20 focus:border-green-500 outline-none transition-colors" placeholder="https://i.imgur.com/..." /></div>
          <div><label className="block text-sm font-medium text-zinc-500 mb-1">Excerpt</label><textarea required name="excerpt" value={formData.excerpt} rows={3} onChange={handleChange} className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 focus:border-green-500 outline-none transition-colors" /></div>
          <div><label className="block text-sm font-medium text-zinc-500 mb-2">Full Content</label><RichTextEditor content={formData.content} onChange={handleContentChange} /></div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2">{loading ? "Saving..." : <><FaPaperPlane /> {editingId ? "Update Post" : "Publish Post"}</>}</button>
        </form>
      </div>
    </main>
  );
}