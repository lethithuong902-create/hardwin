// Hardwin dùng Supabase cloud. Không lưu khóa bí mật trong trình duyệt.
window.hardwinSupabaseReady = (async () => {
  const response = await fetch("/api/supabase-config", { cache: "no-store" });
  const config = await response.json();

  if (!response.ok || !config.url || !config.key) {
    throw new Error(config.error || "Không thể tải cấu hình Supabase.");
  }

  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const supabase = createClient(config.url, config.key);

  window.hardwinSupabase = supabase;
  return supabase;
})();

window.hardwinAuth = {
  async getSession() {
    const supabase = await window.hardwinSupabaseReady;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const supabase = await window.hardwinSupabaseReady;
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async listWorkspaces() {
    const supabase = await window.hardwinSupabaseReady;
    const { data, error } = await supabase
      .from("workspaces")
      .select("id,name,owner_id,plan,created_at")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getProfile() {
    const supabase = await window.hardwinSupabaseReady;
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,account_type,created_at")
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async signOut() {
    const supabase = await window.hardwinSupabaseReady;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentWorkspaceId() {
    return localStorage.getItem("hardwin_current_workspace_id") || "";
  },

  setCurrentWorkspaceId(id) {
    localStorage.setItem("hardwin_current_workspace_id", id);
  },

  clearCurrentWorkspaceId() {
    localStorage.removeItem("hardwin_current_workspace_id");
  }
};
