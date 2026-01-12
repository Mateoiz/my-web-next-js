// app/blogs/[slug]/page.tsx
import type { Metadata } from "next";
import { getPostBySlug } from "@/lib/db";
import BlogPostClient from "./BlogPostClient"; // <--- Imports your file from Step 1

// 1. GENERATE METADATA (For Facebook/Twitter Cards)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Article Not Found - JPCS" };
  }

  return {
    title: post.title,
    description: post.excerpt || "Read this article on JPCS DLSAU.",
    openGraph: {
      title: post.title,
      description: post.excerpt || "Read this article on JPCS DLSAU.",
      images: post.coverImage ? [post.coverImage] : [],
      type: "article",
    },
  };
}

// 2. MAIN PAGE COMPONENT
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogPostClient slug={slug} />;
}