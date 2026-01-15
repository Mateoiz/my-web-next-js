import { getServerSidePosts } from "@/lib/server-db"; // Server-side fetching
import { HomeClient } from "./HomeClient";

export const dynamic = "force-dynamic"; // Ensure fresh data on every visit

export default async function Home() {
  // 1. Fetch data directly from Firebase (Bypasses School Firewall)
  const allPosts = await getServerSidePosts();

  // 2. Get the latest 3 posts
  const latestNews = allPosts.slice(0, 3);

  // 3. Render the client view with the live data
  return <HomeClient latestNews={latestNews} />;
}