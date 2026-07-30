"use client";
import { useState, useEffect } from "react";

function parseTarget(target: string | null): Date | null {
  if (!target) return null;
  const d = new Date(target);
  return isNaN(d.getTime()) ? null : d;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function useCountdown(targetDate: string | null) {
  const [diff, setDiff] = useState<number>(() => {
    const t = parseTarget(targetDate);
    return t ? Math.max(0, t.getTime() - Date.now()) : 0;
  });

  useEffect(() => {
    const t = parseTarget(targetDate);
    if (!t) return;

    const update = () => setDiff(Math.max(0, t.getTime() - Date.now()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!targetDate) return null;

  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return { days, hours, minutes, seconds, total };
}

interface CountdownProps {
  targetDate: string | null;
}

export function Countdown({ targetDate }: CountdownProps) {
  const c = useCountdown(targetDate);

  if (!c || c.total <= 0) return null;

  return (
    <div className="flex items-center gap-3 text-sm font-mono">
      <span className="text-base-content/50">Через</span>
      {c.days > 0 && (
        <>
          <span className="text-white font-bold">{c.days}</span>
          <span className="text-base-content/50">дн</span>
        </>
      )}
      <span className="text-white font-bold">{pad(c.hours)}</span>
      <span className="text-base-content/50">:</span>
      <span className="text-white font-bold">{pad(c.minutes)}</span>
      <span className="text-base-content/50">:</span>
      <span className="text-white font-bold">{pad(c.seconds)}</span>
    </div>
  );
}
