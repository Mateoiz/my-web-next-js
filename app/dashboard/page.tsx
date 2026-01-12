"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext"; // Assuming you have an AuthContext
import { getPendingPosts, updatePostStatus, type BlogPost } from "@/lib/db";
import { useRouter } from "next/navigation";
import { FaCheck, FaTimes, FaPen } from "react-icons/fa";

export default function Dashboard() {
  const { user, userData } = useAuth(); // userData should contain role: 'admin' | 'writer'
  const [pendingPosts, setPendingPosts] = useState<BlogPost[]>([]);
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  // Fetch pending posts ONLY if user is admin
  useEffect(() => {
    if (userData?.role === "admin") {
      const fetchPosts = async () => {
        const posts = await getPendingPosts();
        setPendingPosts(posts);
      };
      fetchPosts();
    }
  }, [userData]);

  const handleApproval = async (id: string, status: "published" | "rejected") => {
    await updatePostStatus(id, status);
    // Refresh list locally
    setPendingPosts(prev => prev.filter(p => p.id !== id));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold">
            Welcome, <span className="text-green-500">{userData?.name || "Officer"}</span>
          </h1>
          
          {/* Create Button (For everyone) */}
          <button 
            onClick={() => router.push("/dashboard/create")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 px-6 py-3 rounded-full font-bold transition-all"
          >
            <FaPen /> Write New Article
          </button>
        </div>

        {/* --- ADMIN VIEW: APPROVAL QUEUE --- */}
        {userData?.role === "admin" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-6 border-b border-zinc-800 pb-4">
              Pending Approvals
            </h2>
            
            {pendingPosts.length === 0 ? (
              <p className="text-zinc-500 italic">No posts waiting for review.</p>
            ) : (
              <div className="space-y-4">
                {pendingPosts.map(post => (
                  <div key={post.id} className="flex items-center justify-between bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{post.title}</h3>
                      <p className="text-sm text-zinc-400">By {post.author} • {new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex gap-3">
                      {/* PREVIEW BUTTON */}
                      <button 
                        onClick={() => window.open(`/preview/${post.id}`, '_blank')}
                        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-bold"
                      >
                        Preview
                      </button>

                      {/* REJECT */}
                      <button 
                        onClick={() => post.id && handleApproval(post.id, "rejected")}
                        className="p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Reject"
                      >
                        <FaTimes />
                      </button>

                      {/* APPROVE */}
                      <button 
                        onClick={() => post.id && handleApproval(post.id, "published")}
                        className="p-3 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"
                        title="Approve & Publish"
                      >
                        <FaCheck />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- WRITER VIEW: MY POSTS --- */}
        {userData?.role !== "admin" && (
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mt-8">
              <h2 className="text-xl font-bold text-zinc-400">My Recent Submissions</h2>
              {/* You would fetch and map 'myPosts' here similar to above */}
           </div>
        )}
      </div>
    </div>
  );
}