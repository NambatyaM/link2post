"use client";

import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";

interface VideoItem {
  id: string;
  title: string;
  url: string;
  videoId: string;
  createdAt: string;
  itemCount: number;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function VideosLibrary({
  session,
  onSelectVideo,
  onNewVideo,
}: {
  session: Session;
  onSelectVideo: (videoId: string) => void;
  onNewVideo: () => void;
}) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/videos", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((data) => setVideos(data.videos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleDelete = async (videoId: string) => {
    setDeleting(videoId);
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== videoId));
      }
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[768px] mx-auto">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl px-4 py-4 animate-pulse" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg" style={{ background: "var(--bg-secondary)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 rounded w-2/3" style={{ background: "var(--bg-secondary)" }} />
                  <div className="h-2.5 rounded w-1/3" style={{ background: "var(--bg-secondary)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[768px] mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Your Videos</h2>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {videos.length} video{videos.length !== 1 ? "s" : ""} processed
          </p>
        </div>
        <button
          onClick={onNewVideo}
          className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ background: "var(--accent)", color: "white" }}
        >
          New content
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No videos yet</p>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Paste a transcript to get started</p>
          <button
            onClick={onNewVideo}
            className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ background: "var(--accent)", color: "white" }}
          >
            Generate content
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded-xl px-4 py-3 flex items-center gap-3 group transition-colors cursor-pointer"
              style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border-light)" }}
              onClick={() => onSelectVideo(video.id)}
            >
              <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,0,0,0.1)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff0000" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{video.title || "Untitled video"}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {video.itemCount} item{video.itemCount !== 1 ? "s" : ""} · {timeAgo(video.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(video.id); }}
                disabled={deleting === video.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all"
                style={{ color: "var(--text-muted)" }}
                title="Delete video"
              >
                {deleting === video.id ? (
                  <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--text-muted)", borderRightColor: "transparent" }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
