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

export default function App() {
  const [bedtimeStart, setBedtimeStart] = useState("19:00");
  const [bedtimeEnd, setBedtimeEnd] = useState("19:30");

  // Wake windows are the intervals between naps (and from last nap → bedtime).
  // If there are N remaining naps after the current one, there are N+1 wake windows.
  const [wakeWindows, setWakeWindows] = useState<DurationInput[]>([
    { id: uid(), minutes: 120 },
    { id: uid(), minutes: 240 },
  ]);
  const [remainingNaps, setRemainingNaps] = useState<DurationInput[]>([
    { id: uid(), minutes: 60 },
  ]);

  const addNap = () => {
    setRemainingNaps((n) => [...n, { id: uid(), minutes: 60 }]);
    setWakeWindows((w) => [...w, { id: uid(), minutes: 180 }]);
  };

  const removeNap = () => {
    if (remainingNaps.length === 0) return;
    setRemainingNaps((n) => n.slice(0, -1));
    setWakeWindows((w) => w.slice(0, -1));
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

    // If bedtime is earlier than now, assume it's later today (never crosses midnight for nap app).
    const wakeEarliest = new Date(bedStart.getTime() - subtract * 60_000);
    const wakeLatest = new Date(bedEnd.getTime() - subtract * 60_000);

    return {
      wakeEarliest,
      wakeLatest,
      totalWake,
      totalNaps,
    };
  }, [bedtimeStart, bedtimeEnd, wakeWindows, remainingNaps]);

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
            {wakeWindows.map((ww, i) => (
              <div key={ww.id} className="slot-group">
                <div className="slot wake">
                  <div className="slot-label">
                    <span className="dot">☀️</span>
                    {i === 0
                      ? "Wake window after current nap"
                      : `Wake window ${i + 1}`}
                  </div>
                  <MinuteInput
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
                      Nap {i + 1}
                    </div>
                    <MinuteInput
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
            ))}
            <div className="bedtime-pill">🌙 Bedtime</div>
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
            (It's currently {formatTime(new Date())} — as of{" "}
            {todayHHMM()})
          </div>
        </section>

        <footer className="footer">
          Made with 💕 for sleepy little ones
        </footer>
      </main>
    </div>
  );
}

function MinuteInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (m: number) => void;
}) {
  return (
    <div className="minute-input">
      <input
        type="number"
        min={0}
        step={5}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
      />
      <span className="min">min</span>
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
