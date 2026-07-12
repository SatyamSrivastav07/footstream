import { useCallback, useEffect, useRef, useState } from "react";
import { eventPresentation } from "./eventPresentation.js";

let nextId = 1;

export default function useEventNotificationQueue() {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const timerRef = useRef(null);

  const enqueue = useCallback((input) => {
    const presentation = eventPresentation(input);
    setQueue((current) => [...current, { ...presentation, id: nextId += 1 }]);
  }, []);

  const dismiss = useCallback(() => {
    setActive(null);
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    setActive(next);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return undefined;
    timerRef.current = window.setTimeout(() => setActive(null), active.duration);
    return () => window.clearTimeout(timerRef.current);
  }, [active]);

  return { active, enqueue, dismiss, pendingCount: queue.length };
}
