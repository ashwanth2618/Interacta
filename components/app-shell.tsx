"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar, Spinner, useToast } from "./ui";
import type { SessionUser } from "@/lib/auth";

/* ------------------------- Notification bell ------------------------- */

interface Notif { id: number; title: string; body: string; link: string; read: boolean; createdAt: string }

function NotificationBell({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const home = role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/student";

  const load = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch { /* offline */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAll" }) });
    await load();
  };
  const markOne = async (id: number) => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markRead", id }) });
    await load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) load(); }}
        className="relative btn-ghost !p-2.5 !rounded-full"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] card !shadow-lift overflow-hidden animate-fade-up z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100">
            <p className="font-bold text-sm">Notifications</p>
            {unread > 0 && <button className="text-xs font-semibold text-brand-600 hover:underline" onClick={markAll}>Mark all read</button>}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 && <div className="p-6 flex justify-center"><Spinner className="text-brand-500" /></div>}
            {!loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-ink-500">
                <div className="text-2xl mb-2">🔔</div>No notifications yet.<br />Updates will appear here.
              </div>
            )}
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.link.startsWith("/student") && role !== "STUDENT" ? home : n.link}
                onClick={() => { markOne(n.id); setOpen(false); }}
                className={`block px-4 py-3 border-b border-ink-50 hover:bg-ink-50 transition-colors ${!n.read ? "bg-brand-50/60" : ""}`}
              >
                <div className="flex items-start gap-2.5">
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-sm ${!n.read ? "font-bold text-ink-900" : "font-semibold text-ink-700"}`}>{n.title}</p>
                    <p className="text-xs text-ink-500 mt-0.5 line-clamp-2-fix">{n.body}</p>
                    <p className="text-[11px] text-ink-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Shell ------------------------------ */

const NAV: Record<string, Array<{ href: string; label: string; icon: string }>> = {
  STUDENT: [
    { href: "/student", label: "Dashboard", icon: "🏠" },
    { href: "/student/issues", label: "My Issues", icon: "🎫" },
    { href: "/student/feedback", label: "Feedback", icon: "💬" },
    { href: "/student/discussions", label: "Discussions", icon: "🗣️" },
    { href: "/student/announcements", label: "Announcements", icon: "📢" },
    { href: "/student/ai", label: "AI Assistant", icon: "🤖" },
    { href: "/student/doubt-solver", label: "Doubt Solver", icon: "🧠" },
    { href: "/student/learning", label: "Learning", icon: "📈" },
    { href: "/student/career", label: "Career", icon: "🎯" },
    { href: "/student/profile", label: "Profile", icon: "👤" },
  ],
  STAFF: [
    { href: "/staff", label: "Dashboard", icon: "🏠" },
    { href: "/staff/issues", label: "Assigned Issues", icon: "🎫" },
    { href: "/staff/discussions", label: "Discussions", icon: "🗣️" },
    { href: "/staff/announcements", label: "Announcements", icon: "📢" },
    { href: "/staff/profile", label: "Profile", icon: "👤" },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: "🏠" },
    { href: "/admin/issues", label: "Issues", icon: "🎫" },
    { href: "/admin/feedback", label: "Feedback", icon: "💬" },
    { href: "/admin/discussions", label: "Discussions", icon: "🗣️" },
    { href: "/admin/announcements", label: "Announcements", icon: "📢" },
    { href: "/admin/staff", label: "Staff", icon: "👔" },
    { href: "/admin/students", label: "Students", icon: "🎓" },
    { href: "/admin/insights", label: "AI Insights", icon: "🤖" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
  ],
};

export default function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [drawer, setDrawer] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const nav = NAV[user.role] ?? [];

  useEffect(() => { setDrawer(false); }, [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast("info", "You have been logged out.");
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || (href !== "/student" && href !== "/staff" && href !== "/admin" && pathname.startsWith(href + "/"));

  return (
    <div className="min-h-screen flex bg-surface">
      {/* backdrop for mobile drawer */}
      {drawer && <div className="fixed inset-0 bg-ink-950/40 z-40 lg:hidden" onClick={() => setDrawer(false)} />}

      {/* sidebar */}
      <aside className={`fixed lg:sticky top-0 h-screen w-64 shrink-0 z-50 lg:z-auto flex flex-col border-r border-ink-200/70 bg-ink-50/95 backdrop-blur transition-transform duration-200 ${drawer ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-200/70">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-lg shadow-soft">I</span>
          <div className="leading-tight">
            <p className="font-black tracking-tight text-ink-900">INTERACTA</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{user.role} portal</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}>
              <span className="text-base w-5 text-center" aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-ink-200/70">
          <button onClick={logout} className="nav-link w-full text-rose-600 hover:!bg-rose-50 hover:!text-rose-700">
            <span className="text-base w-5 text-center" aria-hidden>⏻</span> Sign out
          </button>
        </div>
      </aside>

      {/* main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur border-b border-ink-200/70 flex items-center gap-3 px-4 sm:px-6">
          <button className="btn-ghost !p-2 lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div className="lg:hidden font-black tracking-tight">INTERACTA</div>
          <div className="flex-1" />
          <NotificationBell role={user.role} />
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2.5 rounded-full border border-ink-200 bg-white py-1.5 pl-1.5 pr-3 hover:shadow-soft transition-shadow">
              <Avatar name={user.name} color={user.avatarColor} size={30} />
              <span className="hidden sm:block text-sm font-semibold text-ink-800 max-w-[140px] truncate">{user.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 card !shadow-lift overflow-hidden animate-fade-up z-50">
                <div className="px-4 py-3 border-b border-ink-100">
                  <p className="font-bold text-sm truncate">{user.name}</p>
                  <p className="text-xs text-ink-500 truncate">{user.email}</p>
                </div>
                <Link href={(NAV[user.role] ?? []).at(-1)!.href} onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-ink-50">👤 My profile</Link>
                <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50">⏻ Sign out</button>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
