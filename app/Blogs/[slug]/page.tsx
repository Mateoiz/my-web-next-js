"use client";

import { use } from "react"; 
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { FaArrowLeft, FaTag, FaShareAlt } from "react-icons/fa";

// --- COMPONENT IMPORTS ---
import FloatingCubes from "../../components/FloatingCubes"; 
import CircuitCursor from "../../components/CircuitCursor"; 

// --- MOCK DATA ---
const blogPosts = [
  {
    slug: "JPCS-x-LACES-successful-techquizbee-event",
    title: "JPCS x LACES Successful Techquizbee Event Concludes with Flying Colors",
    subtitle: "Event Report",
    date: "November 25, 2025",
    author: "Ziankyle Piangco",
    category: "Student Life",
    image: "/articles/AR1.JPG", 
    // CONTENT UPDATED TO MATCH YOUR IMAGE TEXT EXACTLY
    content: `
      
    `
  },
  {
    slug: "ai-tech-talk",
    title: "JPCS Tech Talk: The Future of AI in Education",
    subtitle: "Seminar Recap",
    date: "December 10, 2025",
    author: "Sarah Connors",
    category: "Technology",
    image: "/tech-talk.jpg",
    content: `
      <p>Artificial Intelligence is no longer a sci-fi concept—it is here, and it is reshaping how we learn. Last Tuesday, the DLSAU Auditorium was packed for the highly anticipated JPCS Tech Talk.</p>
      <p>Guest speaker Dr. Alan Turing discussed the ethical implications of using LLMs in classroom settings. The talk explored how tools like ChatGPT can be used as personalized tutors rather than plagiarism machines.</p>
    `
  },
  {
    slug: "community-outreach",
    title: "Community Outreach: Bridging the Digital Divide",
    subtitle: "Volunteer Initiative",
    date: "January 15, 2026",
    author: "John Doe",
    category: "Outreach",
    image: "/outreach.jpg",
    content: `
      <p>Technology is a privilege that not everyone enjoys. Recognizing this disparity, the JPCS team organized a weekend outreach program at the local high school.</p>
      <p>The mission was simple: introduce students to the basics of web development. Using only basic laptops and open-source text editors, the team taught 50 high schoolers how to build their first HTML/CSS webpage.</p>
    `
  }
];

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  
  const { slug } = use(params);
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return notFound();

  // Animations
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black selection:bg-green-500/30 relative py-24 px-4 overflow-hidden">
      
      {/* --- BACKGROUND LAYERS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="hidden sm:block absolute inset-0">
          <FloatingCubes />
        </div>
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <CircuitCursor />

      {/* --- ARTICLE CONTAINER --- */}
      <motion.article 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 max-w-4xl mx-auto bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        
        {/* HEADER SECTION */}
        <div className="p-8 md:p-12 pb-0 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight mb-3">
            {post.title}
          </h1>
          <p className="text-green-600 dark:text-green-400 font-bold uppercase tracking-widest text-xs md:text-sm mb-8">
            {post.subtitle}
          </p>
          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-700 mb-6" />
          <div className="flex justify-between items-center text-xs md:text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-8 px-2">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">by:</span>
              <span className="text-zinc-900 dark:text-white font-bold">{post.author}</span>
            </div>
            <div className="text-zinc-500 dark:text-zinc-400">
              {post.date}
            </div>
          </div>
        </div>

        {/* IMAGE SECTION */}
        <motion.div 
          style={{ scale, opacity }}
          className="relative w-full aspect-video md:aspect-[21/9] overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-800"
        >
          <Image 
            src={post.image} 
            alt={post.title} 
            fill 
            priority
            className="object-cover transition-transform duration-700 hover:scale-105"
          />
        </motion.div>

        {/* BODY CONTENT (Styled to match the reference image) */}
        <div className="p-8 md:p-12">
          <div 
            className="
              prose prose-lg dark:prose-invert max-w-none mx-auto
              
              /* Paragraph Typography matching the reference */
              prose-p:text-zinc-700 dark:prose-p:text-zinc-300 
              prose-p:leading-relaxed /* Good line height */
              prose-p:mb-8            /* Spacing between paragraphs */
              prose-p:text-justify    /* Justified text for clean block look */
              md:prose-p:text-lg      /* Slightly larger font on desktop */
              
              /* Links */
              prose-a:text-green-600 dark:prose-a:text-green-400 prose-a:no-underline hover:prose-a:underline
              
              /* Strong/Bold text */
              prose-strong:text-zinc-900 dark:prose-strong:text-white prose-strong:font-bold
            "
            dangerouslySetInnerHTML={{ __html: post.content }} 
          />

          {/* FOOTER */}
          <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <FaTag className="text-green-500" /> 
              <span className="hover:text-green-600 cursor-pointer transition-colors">JPCS</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <span className="hover:text-green-600 cursor-pointer transition-colors">{post.category}</span>
            </div>

            <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-green-500 hover:text-white transition-all text-sm font-bold shadow-sm hover:shadow-green-500/20">
              <FaShareAlt /> Share Article
            </button>
          </div>

          <div className="mt-16 text-center">
            <Link 
              href="/Blogs"
              className="group inline-flex items-center gap-2 text-zinc-500 hover:text-green-600 dark:text-zinc-400 dark:hover:text-green-400 font-medium transition-colors"
            >
              <span className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                <FaArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
              </span>
              Back to Updates
            </Link>
          </div>
        </div>

      </motion.article>
    </main>
  );
}