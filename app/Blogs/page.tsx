"use client";

import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { FaUser, FaCalendarAlt, FaArrowRight } from "react-icons/fa";

// --- IMPORT YOUR THEME COMPONENTS ---
import FloatingCubes from "../components/FloatingCubes"; 
import CircuitCursor from "../components/CircuitCursor"; 

// --- MOCK DATA ---
const blogPosts = [
  {
    id: 1,
    title: "JPCS x LACES Successful Techquizbee Event",
    date: "November 25, 2025",
    author: "Ziankyle Piangco",
    excerpt: "The Junior Philippine Computer Society (JPCS) in collaboration with the LACES organization recently hosted a highly successful Techquizbee event at the DLSAU Auditorium. The event saw enthusiastic participation from students across various departments, showcasing their knowledge and skills in technology and computer science...",
    image: "/articles/AR1.JPG", 
    slug: "JPCS-x-LACES-successful-techquizbee-event",
  },
];

// --- ANIMATIONS ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function BlogPage() {
  return (
    <main className="min-h-screen pt-24 pb-12 px-4 bg-zinc-50 dark:bg-black selection:bg-green-500/30 relative overflow-hidden">
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* FIX: Removed 'hidden sm:block'. Now it renders on all screens. */}
        {/* Added opacity-50 for mobile so text remains readable */}
        <div className="absolute inset-0 opacity-50 sm:opacity-100">
             <FloatingCubes />
        </div>
        
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <CircuitCursor />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Latest <span className="text-green-600 dark:text-green-500">Updates</span>
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-lg">
            Stay in the loop with the latest events and stories from JPCS.
          </p>
        </div>

        {/* GRID */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {blogPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </motion.div>
      </div>
    </main>
  );
}

// --- CARD COMPONENT ---
function BlogCard({ post }: { post: any }) {
  return (
    <motion.div 
      variants={cardVariants}
      className="group flex flex-col h-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden hover:shadow-lg dark:hover:shadow-[0_10px_40px_-10px_rgba(34,197,94,0.2)] transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative h-48 w-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <Image 
          src={post.image} 
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-green-700 dark:text-green-400 shadow-sm">
           News
        </div>
      </div>

      <div className="flex flex-col flex-grow p-6">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight mb-3 group-hover:text-green-600 dark:group-hover:text-green-500 transition-colors">
          {post.title}
        </h3>

        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          <span className="flex items-center gap-1"><FaCalendarAlt /> {post.date}</span>
          <span className="flex items-center gap-1"><FaUser /> {post.author}</span>
        </div>

        <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed mb-6 line-clamp-3">
          {post.excerpt}
        </p>

        <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          {/* LINK TO THE INDIVIDUAL PAGE */}
          <Link 
            href={`/Blogs/${post.slug}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors"
          >
            Read More <FaArrowRight />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}