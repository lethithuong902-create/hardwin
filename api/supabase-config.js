export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Supabase publishable key is safe for the browser when RLS is enabled.
  // Prefer Vercel env vars when available, but keep Hardwin usable without
  // requiring a manual Vercel configuration step for the public client.
  const url = process.env.SUPABASE_URL || "https://hhxjfgxkxxbqjxoklfmi.supabase.co";
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "sb_publishable_Gwypq9ohWqXpqj2G_d3F4w_VLyin5IZ";

  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  return res.status(200).json({ url, key });
}
