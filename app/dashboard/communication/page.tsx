"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AppShell, { type NavItem } from "@/components/layout/AppShell";

const supabase = createClient();

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Members", href: "/dashboard/members" },
  { label: "Departments", href: "/dashboard/departments" },
  { label: "Attendance", href: "/dashboard/attendance" },
  { label: "Calendar", href: "/dashboard/calendar" },
  { label: "Prayer", href: "/dashboard/prayer" },
  { label: "Bulletin", href: "/dashboard/bulletin" },
  { label: "Communication Hub", href: "/dashboard/communication" },
  { label: "Visitation", href: "/dashboard/visitation" },
  { label: "Shepherd Pipeline", href: "/dashboard/shepherd" },
  { label: "Reviews", href: "/dashboard/reviews" },
  { label: "Evangelism", href: "/dashboard/evangelism" },
  { label: "Birthdays", href: "/dashboard/birthdays" },
  { label: "Tutorials", href: "/dashboard/tutorials" },
  { label: "Settings", href: "/dashboard/settings" },
];

type Post = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "published" | "scheduled";
  scheduled_at: string | null;
  notify_email: boolean;
  published_at: string | null;
  read_count: number;
  created_at: string;
  author_email: string;
  department_id: string | null;
  departments: { name: string; icon: string | null; color: string } | null;
};

type Department = { id: string; name: string; icon: string | null; color: string };

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
  published: { label: "Published", bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  scheduled: { label: "Scheduled", bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export default function CommunicationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterDept, setFilterDept] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user || error) {
        console.log("Dashboard client user unavailable:", error?.message ?? null);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setToken(session.access_token);

      const [postsRes, deptsRes] = await Promise.all([
        fetch("/api/communication", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/departments", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);

      const postsData = await postsRes.json();
      const deptsData = await deptsRes.json();
      setPosts(postsData.posts ?? []);
      setDepartments(deptsData.departments ?? []);
      setLoading(false);
    }
    init();
  }, []);

  async function handleDelete(id: string) {
    if (!token || !confirm("Delete this post? This cannot be undone.")) return;
    setDeletingId(id);
    const res = await fetch(`/api/communication/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } else {
      setError("Failed to delete post.");
    }
    setDeletingId(null);
  }

  const filtered = useMemo(() => {
    if (filterDept === "all") return posts;
    if (filterDept === "church_wide") return posts.filter((p) => !p.department_id);
    return posts.filter((p) => p.department_id === filterDept);
  }, [posts, filterDept]);

  const churchWide = filtered.filter((p) => !p.department_id);
  const deptPosts = filtered.filter((p) => !!p.department_id);

  if (loading) {
    return (
      <AppShell navItems={navItems}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af" }}>Loading…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell navItems={navItems}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)", padding: "32px 40px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📣</div>
            <h1 style={{ color: "white", fontSize: "28px", fontFamily: "Georgia, serif", fontWeight: "normal", margin: "0 0 4px" }}>
              Communication Hub
            </h1>
            <p style={{ color: "rgba(255,255,255,0.75)", fontFamily: "Georgia, serif", fontSize: "15px", margin: 0 }}>
              Keep every ministry connected
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link
              href="/dashboard/communication/add?type=department"
              style={{
                padding: "12px 20px",
                background: "rgba(255,255,255,0.15)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: "10px",
                textDecoration: "none",
                fontFamily: "Georgia, serif",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              + Department Post
            </Link>
            <Link
              href="/dashboard/communication/add?type=church_wide"
              style={{
                padding: "12px 20px",
                background: "#F28C28",
                color: "white",
                border: "none",
                borderRadius: "10px",
                textDecoration: "none",
                fontFamily: "Georgia, serif",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              + New Announcement
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 40px" }}>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px" }}>
            <p style={{ color: "#dc2626", fontFamily: "Georgia, serif", fontSize: "14px", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280" }}>Filter:</span>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ padding: "8px 14px", borderRadius: "8px", border: "2px solid #e5e7eb", fontFamily: "Georgia, serif", fontSize: "14px", color: "#374151", background: "white", cursor: "pointer" }}
          >
            <option value="all">All Posts</option>
            <option value="church_wide">Church-Wide Only</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.icon ? `${d.icon} ` : ""}{d.name}</option>
            ))}
          </select>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af" }}>
            {filtered.length} post{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Church-Wide Announcements */}
        {(filterDept === "all" || filterDept === "church_wide") && (
          <section style={{ marginBottom: "40px" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#1A4A2E", marginTop: 0, marginBottom: "16px", fontWeight: "normal", display: "flex", alignItems: "center", gap: "8px" }}>
              🏛️ Church-Wide Announcements
              <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af", fontWeight: "normal" }}>({churchWide.length})</span>
            </h2>
            {churchWide.length === 0 ? (
              <div style={{ background: "white", border: "2px dashed #e5e7eb", borderRadius: "12px", padding: "36px", textAlign: "center" }}>
                <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af", fontSize: "15px", margin: 0 }}>No church-wide announcements yet.</p>
                <Link href="/dashboard/communication/add?type=church_wide" style={{ display: "inline-block", marginTop: "14px", color: "#0e7490", fontFamily: "Georgia, serif", fontSize: "14px" }}>
                  Create the first one →
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {churchWide.map((post) => <PostCard key={post.id} post={post} onDelete={handleDelete} deletingId={deletingId} />)}
              </div>
            )}
          </section>
        )}

        {/* Department Posts */}
        {filterDept !== "church_wide" && (
          <section>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: "#1A4A2E", marginTop: 0, marginBottom: "16px", fontWeight: "normal", display: "flex", alignItems: "center", gap: "8px" }}>
              🏢 Department Posts
              <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", color: "#9ca3af", fontWeight: "normal" }}>({deptPosts.length})</span>
            </h2>
            {deptPosts.length === 0 ? (
              <div style={{ background: "white", border: "2px dashed #e5e7eb", borderRadius: "12px", padding: "36px", textAlign: "center" }}>
                <p style={{ fontFamily: "Georgia, serif", color: "#9ca3af", fontSize: "15px", margin: 0 }}>No department posts yet.</p>
                <Link href="/dashboard/communication/add?type=department" style={{ display: "inline-block", marginTop: "14px", color: "#0e7490", fontFamily: "Georgia, serif", fontSize: "14px" }}>
                  Create one →
                </Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {deptPosts.map((post) => <PostCard key={post.id} post={post} onDelete={handleDelete} deletingId={deletingId} />)}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

function PostCard({ post, onDelete, deletingId }: { post: Post; onDelete: (id: string) => void; deletingId: string | null }) {
  const status = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const dept = post.departments;
  const dateLabel = post.published_at ? formatDate(post.published_at) : formatDate(post.created_at);

  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px 24px", display: "flex", alignItems: "flex-start", gap: "16px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badges */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
          {!post.department_id ? (
            <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", fontWeight: "bold", padding: "3px 10px", borderRadius: "999px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>
              🏛️ All Church
            </span>
          ) : (
            <span style={{
              fontFamily: "Georgia, serif", fontSize: "12px", fontWeight: "bold", padding: "3px 10px",
              borderRadius: "999px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0",
            }}>
              {dept?.icon && `${dept.icon} `}{dept?.name ?? "Department"}
            </span>
          )}
          <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", padding: "3px 10px", borderRadius: "999px", background: status.bg, color: status.text, border: `1px solid ${status.border}` }}>
            {status.label}
          </span>
          {post.notify_email && (
            <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", padding: "3px 10px", borderRadius: "999px", background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              📧 Emailed
            </span>
          )}
        </div>

        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "17px", color: "#1f2937", margin: "0 0 6px", fontWeight: "bold" }}>
          {post.title}
        </h3>
        <p style={{ fontFamily: "Georgia, serif", fontSize: "14px", color: "#6b7280", margin: "0 0 10px", lineHeight: "1.5" }}>
          {truncate(post.body, 140)}
        </p>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af" }}>📅 {dateLabel}</span>
          <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af" }}>✍️ {post.author_email}</span>
          {post.read_count > 0 && (
            <span style={{ fontFamily: "Georgia, serif", fontSize: "12px", color: "#9ca3af" }}>👁 {post.read_count} read</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <Link
          href={`/dashboard/communication/${post.id}/edit`}
          style={{ padding: "8px 14px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: "8px", textDecoration: "none", fontFamily: "Georgia, serif", fontSize: "13px" }}
        >
          Edit
        </Link>
        <button
          onClick={() => onDelete(post.id)}
          disabled={deletingId === post.id}
          style={{ padding: "8px 14px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontFamily: "Georgia, serif", fontSize: "13px", cursor: "pointer" }}
        >
          {deletingId === post.id ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
