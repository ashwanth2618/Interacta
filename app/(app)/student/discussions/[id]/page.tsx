"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeading, timeAgo } from "@/components/shared";
import { Modal, Spinner, useToast, EmptyState } from "@/components/ui";
import { CategoryChip } from "@/components/badges";
import type { SessionUser } from "@/lib/auth";
import { getSessionClient } from "@/components/session";

interface Comment { id: number; body: string; authorName: string; authorRole: string; isAnonymous: boolean; createdAt: string }
interface PostData {
  post: { id: number; title: string; body: string; category: string; authorName: string; authorRole: string; isAnonymous: boolean; likes: number[]; views: number; createdAt: string };
  comments: Comment[];
}

export default function DiscussionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const toast = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [anon, setAnon] = useState(false);
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/discussions/${id}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Failed to load");
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => { getSessionClient().then(setUser); }, []);

  const act = async (payload: Record<string, unknown>, okMsg: string) => {
    const res = await fetch(`/api/discussions/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { toast("error", j.error || "Action failed"); return false; }
    if (okMsg) toast("success", okMsg);
    await load();
    return true;
  };

  if (loading) return <div className="py-12 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>;
  if (error) return <div className="card p-10 text-center"><EmptyState icon="⚠️" title="Could not load discussion" body={error} action={<button className="btn-primary" onClick={() => router.back()}>Go back</button>} /></div>;
  if (!data) return null;
  const p = data.post;
  const liked = user ? p.likes.includes(user.id) : false;

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <Link href=".." className="text-sm font-semibold text-ink-500 hover:text-brand-600 inline-flex items-center gap-1 mb-4">← Back to discussions</Link>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <CategoryChip>{p.category}</CategoryChip>
          {p.isAnonymous && <span className="badge bg-ink-900 text-white">🕵️ Anonymous</span>}
          <span className="text-xs text-ink-400 ml-auto">👁 {p.views} views</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-ink-900">{p.title}</h1>
        <p className="text-sm text-ink-500 mt-1.5">
          By <span className="font-semibold text-ink-700">{p.authorName}</span> · {p.authorRole} · {timeAgo(p.createdAt)}
        </p>
        <p className="mt-4 text-ink-700 whitespace-pre-wrap leading-relaxed">{p.body}</p>
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-ink-100">
          <button className={liked ? "btn-primary !py-2" : "btn-secondary !py-2"} onClick={() => act({ action: "like" }, "")}>
            {liked ? "❤️ Liked" : "🤍 Like"} ({p.likes.length})
          </button>
          <button className="btn-ghost !py-2 text-ink-500" onClick={() => setReportOpen(true)}>🚩 Report</button>
        </div>
      </div>

      <h2 className="section-title mt-6 mb-3">Comments ({data.comments.length})</h2>
      {data.comments.length === 0 && <div className="card"><EmptyState icon="💬" title="No replies yet" body="Be the first to help or share your view." /></div>}
      <div className="space-y-3">
        {data.comments.map((c) => (
          <div key={c.id} className={`card p-4 ${c.authorRole !== "STUDENT" ? "border-brand-200 bg-brand-50/40" : ""}`}>
            <p className="text-sm font-bold text-ink-800">
              {c.authorRole === "ADMIN" ? "🏛️ " : c.authorRole === "STAFF" ? "👔 " : "🎓 "}{c.authorName}
              {c.authorRole !== "STUDENT" && <span className="badge bg-brand-100 text-brand-700 ml-2">Faculty</span>}
              <span className="text-ink-400 font-normal"> · {timeAgo(c.createdAt)}</span>
            </p>
            <p className="text-sm text-ink-700 mt-1.5 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="card p-4 mt-4">
        <textarea className="input min-h-[80px]" placeholder="Write a reply… share what you know, kindly."
          value={comment} onChange={(e) => setComment(e.target.value)} aria-label="Write a comment" />
        <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            Reply anonymously
          </label>
          <button className="btn-primary" disabled={comment.trim().length < 2 || sending}
            onClick={async () => {
              setSending(true);
              const okRes = await act({ action: "comment", body: comment.trim(), isAnonymous: anon }, "Reply posted");
              if (okRes) { setComment(""); setAnon(false); }
              setSending(false);
            }}>
            {sending ? "Posting…" : "Post reply"}
          </button>
        </div>
      </div>

      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title="Report this post">
        <p className="text-sm text-ink-600 mb-3">Why are you reporting this post? Moderators will review it.</p>
        <div className="space-y-2">
          {["Spam or advertising", "Harassment or bullying", "Inappropriate content", "Misinformation"].map((r) => (
            <button key={r} className={`w-full text-left rounded-xl border p-3 text-sm font-medium transition-colors ${reportReason === r ? "border-brand-500 bg-brand-50/70" : "border-ink-200 hover:bg-ink-50"}`}
              onClick={() => setReportReason(r)}>{r}</button>
          ))}
        </div>
        <button className="btn-danger w-full mt-4" disabled={!reportReason}
          onClick={async () => {
            const okRes = await act({ action: "report", reason: reportReason }, "Report sent to moderators — thank you");
            if (okRes) { setReportOpen(false); setReportReason(""); }
          }}>Submit report</button>
      </Modal>
    </div>
  );
}
