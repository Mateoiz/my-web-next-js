import type { Metadata } from "next";
import { getServerSidePostBySlug } from "@/lib/server-db"; // 1. Import server fetcher
import BlogPostClient from "./BlogPostClient"; // 2. Import client display

// GENERATE METADATA (For SEO/Facebook/Twitter)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getServerSidePostBySlug(slug);

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

// MAIN PAGE COMPONENT
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 3. FETCH DATA HERE (On the Server)
  // This runs in the cloud, bypassing the school firewall
  const post = await getServerSidePostBySlug(slug);

  // 4. Pass the full 'post' data to the client component
  return <BlogPostClient post={post} />;
}