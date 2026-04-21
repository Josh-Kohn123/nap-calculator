import { useMemo, useState } from "react";

type DurationInput = {
  id: string;
  minutes: number;
};

const uid = () => Math.random().toString(36).slice(2, 9);

const parseTimeToDate = (hhmm: string, base: Date): Date => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

const formatTime = (d: Date): string => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const todayHHMM = (): string => {
  const n = new Date();
  return `${n.getHours().toString().padStart(2, "0")}:${n
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

const LAST_WAKE_WINDOW = 150; // 2h 30m, bedtime-leading

// Smart defaults based on current time.
// Before noon → 2 more naps; noon–3pm → 1 more nap; after 3pm → 0 more naps.
// The last wake window is always 150 min (the one leading into bedtime).
function defaultSchedule(): { wakeWindows: number[]; naps: number[] } {
  const h = new Date().getHours();
  if (h < 12) {
    return { wakeWindows: [120, 120, LAST_WAKE_WINDOW], naps: [90, 60] };
  }
  if (h < 15) {
    return { wakeWindows: [120, LAST_WAKE_WINDOW], naps: [60] };
  }
  return { wakeWindows: [LAST_WAKE_WINDOW], naps: [] };
}

export default function App() {
  const [bedtimeStart, setBedtimeStart] = useState("19:00");
  const [bedtimeEnd, setBedtimeEnd] = useState("19:30");

  const [wakeWindows, setWakeWindows] = useState<DurationInput[]>(() =>
    defaultSchedule().wakeWindows.map((m) => ({ id: uid(), minutes: m }))
  );
  const [remainingNaps, setRemainingNaps] = useState<DurationInput[]>(() =>
    defaultSchedule().naps.map((m) => ({ id: uid(), minutes: m }))
  );

  // Adding a nap: insert new wake window *before* the last one (so the last WW
  // stays the bedtime-leading one), and append a nap.
  const addNap = () => {
    setRemainingNaps((n) => [...n, { id: uid(), minutes: 60 }]);
    setWakeWindows((w) => {
      const next = [...w];
      const insertAt = Math.max(0, next.length - 1);
      next.splice(insertAt, 0, { id: uid(), minutes: 120 });
      return next;
    });
  };

  // Removing: drop last nap + drop the second-to-last wake window (keeps bedtime WW).
  const removeNap = () => {
    if (remainingNaps.length === 0) return;
    setRemainingNaps((n) => n.slice(0, -1));
    setWakeWindows((w) => {
      if (w.length <= 1) return w;
      const next = [...w];
      next.splice(next.length - 2, 1);
      return next;
    });
  };

  const updateDuration = (
    list: DurationInput[],
    setList: (v: DurationInput[]) => void,
    id: string,
    minutes: number
  ) => {
    setList(list.map((d) => (d.id === id ? { ...d, minutes } : d)));
  };

  const result = useMemo(() => {
    const totalWake = wakeWindows.reduce((s, d) => s + (d.minutes || 0), 0);
    const totalNaps = remainingNaps.reduce((s, d) => s + (d.minutes || 0), 0);
    const subtract = totalWake + totalNaps;

    const base = new Date();
    const bedStart = parseTimeToDate(bedtimeStart, base);
    const bedEnd = parseTimeToDate(bedtimeEnd, base);

    const wakeEarliest = new Date(bedStart.getTime() - subtract * 60_000);
    const wakeLatest = new Date(bedEnd.getTime() - subtract * 60_000);
    const wakeMid = new Date((wakeEarliest.getTime() + wakeLatest.getTime()) / 2);

    // Build the chained event timeline using wakeMid as the anchor.
    type Slot = { kind: "wake" | "nap"; index: number; start: Date; end: Date };
    const timeline: Slot[] = [];
    let cursor = new Date(wakeMid);
    for (let i = 0; i < wakeWindows.length; i++) {
      const ww = wakeWindows[i].minutes || 0;
      const start = new Date(cursor);
      cursor = new Date(cursor.getTime() + ww * 60_000);
      timeline.push({ kind: "wake", index: i, start, end: new Date(cursor) });
      if (i < remainingNaps.length) {
        const np = remainingNaps[i].minutes || 0;
        const napStart = new Date(cursor);
        cursor = new Date(cursor.getTime() + np * 60_000);
        timeline.push({ kind: "nap", index: i, start: napStart, end: new Date(cursor) });
      }
    }

    return { wakeEarliest, wakeLatest, wakeMid, totalWake, totalNaps, timeline };
  }, [bedtimeStart, bedtimeEnd, wakeWindows, remainingNaps]);

  const timeFor = (kind: "wake" | "nap", index: number) =>
    result.timeline.find((s) => s.kind === kind && s.index === index);

  return (
    <div className="page">
      <div className="clouds" aria-hidden>
        <span className="cloud c1">☁️</span>
        <span className="cloud c2">☁️</span>
        <span className="cloud c3">⭐</span>
        <span className="cloud c4">🌙</span>
        <span className="cloud c5">☁️</span>
      </div>

      <main className="card">
        <header className="header">
          <div className="title-row">
            <span className="emoji-big" aria-hidden>🍼</span>
            <h1>Nap Wake-Up Helper</h1>
            <span className="emoji-big" aria-hidden>🧸</span>
          </div>
          <p className="subtitle">
            Tell me baby's schedule and I'll tell you when to sneak in for the wake-up 💤
          </p>
        </header>

        <section className="section">
          <h2>🌙 Target Bedtime</h2>
          <div className="row">
            <label className="field">
              <span>Earliest</span>
              <input
                type="time"
                value={bedtimeStart}
                onChange={(e) => setBedtimeStart(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Latest</span>
              <input
                type="time"
                value={bedtimeEnd}
                onChange={(e) => setBedtimeEnd(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2>🍼 Schedule After This Nap</h2>
            <div className="btn-row">
              <button className="btn pill-btn" onClick={removeNap} disabled={remainingNaps.length === 0}>
                − Nap
              </button>
              <button className="btn pill-btn primary" onClick={addNap}>
                + Nap
              </button>
            </div>
          </div>

          <div className="schedule">
            {wakeWindows.map((ww, i) => {
              const isLastWW = i === wakeWindows.length - 1;
              const wakeSlot = timeFor("wake", i);
              const napSlot = timeFor("nap", i);
              return (
                <div key={ww.id} className="slot-group">
                  <div className="slot wake">
                    <div className="slot-label">
                      <span className="dot">☀️</span>
                      <div className="slot-text">
                        <div className="slot-title">
                          {i === 0
                            ? "Wake window after current nap"
                            : isLastWW
                            ? "Wake window before bedtime"
                            : `Wake window ${i + 1}`}
                        </div>
                        {wakeSlot && (
                          <div className="slot-time">
                            {formatTime(wakeSlot.start)} – {formatTime(wakeSlot.end)}
                          </div>
                        )}
                      </div>
                    </div>
                    <HourMinuteInput
                      value={ww.minutes}
                      onChange={(m) =>
                        updateDuration(wakeWindows, setWakeWindows, ww.id, m)
                      }
                    />
                  </div>
                  {i < remainingNaps.length && (
                    <div className="slot nap">
                      <div className="slot-label">
                        <span className="dot">💤</span>
                        <div className="slot-text">
                          <div className="slot-title">Nap {i + 1}</div>
                          {napSlot && (
                            <div className="slot-time">
                              {formatTime(napSlot.start)} – {formatTime(napSlot.end)}
                            </div>
                          )}
                        </div>
                      </div>
                      <HourMinuteInput
                        value={remainingNaps[i].minutes}
                        onChange={(m) =>
                          updateDuration(
                            remainingNaps,
                            setRemainingNaps,
                            remainingNaps[i].id,
                            m
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div className="bedtime-pill">
              🌙 Bedtime ({formatTime(parseTimeToDate(bedtimeStart, new Date()))} – {formatTime(parseTimeToDate(bedtimeEnd, new Date()))})
            </div>
          </div>
        </section>

        <section className="result">
          <h2>✨ Wake baby between ✨</h2>
          <div className="times">
            <div className="time-box">
              <div className="time-label">Earliest</div>
              <div className="time-value">{formatTime(result.wakeEarliest)}</div>
            </div>
            <div className="sep">→</div>
            <div className="time-box">
              <div className="time-label">Latest</div>
              <div className="time-value">{formatTime(result.wakeLatest)}</div>
            </div>
          </div>
          <div className="totals">
            Total wake time: <strong>{formatDuration(result.totalWake)}</strong>
            <span className="sep-dot">•</span>
            Total naps after: <strong>{formatDuration(result.totalNaps)}</strong>
          </div>
          <div className="now">
            (It's currently {formatTime(new Date())} — as of {todayHHMM()})
          </div>
        </section>

        <footer className="footer">Made with 💕 for sleepy little ones</footer>
      </main>
    </div>
  );
}

function HourMinuteInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (m: number) => void;
}) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;

  const setHours = (h: number) => {
    const clamped = Math.max(0, Math.min(12, Number.isFinite(h) ? h : 0));
    onChange(clamped * 60 + mins);
  };
  const setMins = (m: number) => {
    const clamped = Math.max(0, Math.min(59, Number.isFinite(m) ? m : 0));
    onChange(hours * 60 + clamped);
  };

  return (
    <div className="hm-input">
      <div className="hm-group">
        <input
          type="number"
          min={0}
          max={12}
          value={hours}
          onChange={(e) => setHours(parseInt(e.target.value || "0", 10))}
        />
        <span className="hm-unit">hr</span>
      </div>
      <div className="hm-group">
        <input
          type="number"
          min={0}
          max={59}
          step={5}
          value={mins}
          onChange={(e) => setMins(parseInt(e.target.value || "0", 10))}
        />
        <span className="hm-unit">min</span>
      </div>
    </div>
  );
}

function formatDuration(mins: number): string {
  if (!mins) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
