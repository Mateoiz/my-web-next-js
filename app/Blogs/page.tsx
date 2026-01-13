 "use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaUser, FaCalendarAlt, FaArrowRight, FaSearch, FaTerminal, FaPenNib } from "react-icons/fa";
import { getPublishedPosts, type BlogPost } from "@/lib/db"; 

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // --- FETCH DATA FROM DB ---
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await getPublishedPosts();
        setPosts(data);
      } catch (error) {
        console.error("Failed to fetch archives:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(search.toLowerCase()) ||
    post.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-zinc-100 font-sans pt-24 md:pt-32 pb-20 transition-colors duration-300">
      
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 md:gap-8 mb-12 md:mb-16 border-b-2 border-black dark:border-zinc-800 pb-8 relative">
          
          {/* WRITER ACCESS BUTTON */}
          {/* Mobile: Relative Position | Desktop: Absolute Top-Right */}
          <Link 
            href="/signup" 
            className="md:absolute md:top-0 md:right-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors mb-4 md:mb-0"
          >
            <FaPenNib className="mb-0.5" />
            Writer_Access_Portal
          </Link>

          <div className="space-y-4 w-full md:w-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white dark:bg-zinc-800 dark:text-zinc-300 text-xs font-mono uppercase tracking-widest font-bold">
               <span>// System_Log</span>
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
            </div>
            
            {/* Title: Scaled down for mobile (text-4xl) up to text-8xl on desktop */}
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800 dark:from-green-400 dark:to-green-600">Archives</span>
            </h1>
            
            <p className="text-zinc-600 dark:text-zinc-400 max-w-xl text-base md:text-lg font-medium leading-relaxed">
              Transmissions, updates, and technical breakdowns from the JPCS network.
            </p>
          </div>

          {/* Search Bar */}
          <div className="w-full md:w-auto relative group mt-4 md:mt-0">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <FaSearch className="text-zinc-400" />
            </div>
            <input 
                type="text" 
                placeholder="Search database..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-80 pl-10 pr-4 py-3 md:py-4 bg-zinc-50 dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 font-bold text-sm outline-none focus:bg-white dark:focus:bg-black transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none focus:translate-y-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
        </div>

        {/* --- LOADING STATE --- */}
        {loading && (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                 <div key={i} className="h-80 md:h-96 bg-zinc-100 dark:bg-zinc-900 animate-pulse border-2 border-zinc-200 dark:border-zinc-800 rounded-none" />
              ))}
           </div>
        )}

        {/* --- EMPTY STATE --- */}
        {!loading && filteredPosts.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl">
                <FaTerminal className="w-12 h-12 mx-auto text-zinc-300 mb-4" />
                <p className="text-zinc-400 font-bold uppercase tracking-widest px-4">No transmissions found matching query.</p>
            </div>
        )}

        {/* --- POST GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {!loading && filteredPosts.map((post) => (
            <Link href={`/Blogs/${post.slug}`} key={post.id} className="group block h-full">
              <motion.article 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, x: -4 }}
                className="h-full flex flex-col bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-800 overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-none transition-all duration-200 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]"
              >
                {/* Image */}
                <div className="relative h-48 md:h-56 w-full border-b-2 border-black dark:border-zinc-800 overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {post.coverImage ? (
                    <Image 
                        src={post.coverImage} 
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-200 dark:bg-zinc-800">
                        <span className="text-zinc-400 font-bold uppercase text-xs">No Cover</span>
                    </div>
                  )}
                  <div className="absolute top-0 right-0 bg-black text-white dark:bg-green-600 dark:text-black px-3 py-1 text-xs font-bold uppercase tracking-wider border-l-2 border-b-2 border-black dark:border-zinc-800">
                     {post.category}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-grow p-5 md:p-6">
                  <div className="flex items-center gap-3 text-xs font-bold font-mono text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wide">
                    <span className="flex items-center gap-1">
                        <FaCalendarAlt /> 
                        {/* Handle Timestamp conversion safely */}
                        {post.createdAt?.seconds 
                            ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() 
                            : "Recent"}
                    </span>
                    <span className="w-px h-3 bg-zinc-300 dark:bg-zinc-700"/>
                    <span className="flex items-center gap-1 text-black dark:text-zinc-200 truncate max-w-[100px]"><FaUser /> {post.author}</span>
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-black dark:text-white leading-tight mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="mt-auto pt-4 border-t-2 border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest group-hover:text-black dark:group-hover:text-white transition-colors">
                        Read_Article
                    </span>
                    <div className="p-2 bg-black text-white dark:bg-zinc-800 dark:text-zinc-300 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <FaArrowRight size={12} />
                    </div>
                  </div>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
 