import { useEffect, useState } from 'react';

export default function LiveTimer({ elapsedSeconds = 0, running = false }) {
  const [seconds, setSeconds] = useState(elapsedSeconds);
  useEffect(() => setSeconds(elapsedSeconds), [elapsedSeconds]);
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return <span className="font-display tabular-nums">{minutes}:{remainder}</span>;
}

