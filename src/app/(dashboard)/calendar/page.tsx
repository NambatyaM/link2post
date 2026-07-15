"use client";

import { useState, useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { CalendarEntry } from "@/lib/types";

interface DayCell {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: DayCell[] = [];
  const prevMonthLast = new Date(year, month, 0).getDate();

  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLast - i);
    cells.push({ date: d, isCurrentMonth: false, isToday: false });
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ date: d, isCurrentMonth: true, isToday: dateStr === todayStr });
  }

  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({ date: d, isCurrentMonth: false, isToday: false });
  }

  return cells;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragEntry, setDragEntry] = useState<CalendarEntry | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const dragRef = useRef<CalendarEntry | null>(null);

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) { setEntries([]); setLoading(false); }
          return;
        }

        const res = await fetch(`/api/calendar/month?month=${monthStr}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (!cancelled) setEntries(data.entries || []);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [monthStr, refetchKey]);

  const grid = buildMonthGrid(year, month);

  const entriesByDate = entries.reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
    const key = entry.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const goToPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goToNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDragStart = (entry: CalendarEntry) => {
    dragRef.current = entry;
    setDragEntry(entry);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDragEntry(null);
  };

  const handleDrop = async (targetDate: string) => {
    const entry = dragRef.current;
    if (!entry || entry.date === targetDate) {
      handleDragEnd();
      return;
    }

    setEntries((prev) =>
      prev.map((e) =>
        e === entry ? { ...e, date: targetDate } : e
      )
    );

    try {
      const supabase = getSupabaseBrowser();
      const { data: { session } } = await supabase.auth.getSession();
      if (session && entry.itemId) {
        await fetch(`/api/calendar/${entry.itemId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ date: targetDate }),
        });
      }
    } catch {
      setRefetchKey((k) => k + 1);
    }

    handleDragEnd();
  };

  const selectedEntries = selectedDate ? entriesByDate[selectedDate] || [] : [];

  return (
    <main className="min-h-screen px-6 py-10 max-w-[1080px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Schedule and manage your LinkedIn posts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center" style={{ color: "var(--text-primary)" }}>
            {monthLabel}
          </span>
          <button
            onClick={goToNext}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-xs font-medium text-center py-3"
              style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((cell, idx) => {
            const key = dateKey(cell.date);
            const dayEntries = entriesByDate[key] || [];
            const isOver = dragEntry && dragEntry.date !== key;

            return (
              <div
                key={idx}
                className="min-h-[100px] p-2 transition-colors relative"
                style={{
                  borderRight: (idx + 1) % 7 !== 0 ? "1px solid var(--border)" : undefined,
                  borderBottom: idx < 35 ? "1px solid var(--border)" : undefined,
                  background: isOver ? "rgba(129,140,248,0.06)" : "transparent",
                  opacity: cell.isCurrentMonth ? 1 : 0.35,
                }}
                onClick={() => setSelectedDate(key)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(key)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      color: cell.isToday ? "white" : "var(--text-secondary)",
                      background: cell.isToday ? "var(--accent)" : "transparent",
                    }}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayEntries.slice(0, 3).map((entry, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => handleDragStart(entry)}
                      onDragEnd={handleDragEnd}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-grab active:cursor-grabbing"
                      style={{
                        background: entry.type === "article" ? "rgba(99,102,241,0.15)" : "rgba(129,140,248,0.12)",
                        color: entry.type === "article" ? "#818CF8" : "var(--text-secondary)",
                      }}
                      title={entry.title}
                    >
                      {entry.title.length > 18 ? entry.title.slice(0, 18) + "..." : entry.title}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      +{dayEntries.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="w-full max-w-md rounded-xl p-6"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {selectedEntries.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
                No posts scheduled for this day.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedEntries.map((entry, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(entry)}
                    onDragEnd={handleDragEnd}
                    className="flex items-start gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing"
                    style={{ background: "var(--bg-tertiary)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{
                        background: entry.type === "article" ? "#6366F1" : "var(--accent)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded capitalize"
                          style={{
                            background: entry.type === "article" ? "rgba(99,102,241,0.15)" : "rgba(129,140,248,0.12)",
                            color: entry.type === "article" ? "#818CF8" : "var(--text-secondary)",
                          }}
                        >
                          {entry.type}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {entry.recommendedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="mt-12 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 opacity-40"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No posts scheduled. Generate a project to fill your calendar!
          </p>
        </div>
      )}
    </main>
  );
}
