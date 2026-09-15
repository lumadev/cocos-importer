import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 40;

/** Progressive window over an in-memory list (infinite scroll). */
export function useInfiniteSlice<T>(items: T[], resetKey: string) {
  const [count, setCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setCount(PAGE_SIZE);
  }, [resetKey]);

  const visible = items.slice(0, count);
  const hasMore = count < items.length;
  const loadMore = useCallback(() => {
    setCount((c) => Math.min(c + PAGE_SIZE, items.length));
  }, [items.length]);

  return {
    visible,
    hasMore,
    loadMore,
    total: items.length,
    shown: visible.length,
  };
}

/** Sentinel that calls `onVisible` when it enters the viewport. */
export function InfiniteSentinel({
  onVisible,
  active,
}: {
  onVisible: () => void;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisibleRef.current();
      },
      { rootMargin: "240px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [active]);

  if (!active) return null;
  return <div ref={ref} className="h-px w-full" aria-hidden />;
}

export function InfiniteStatus({
  shown,
  total,
  hasMore,
}: {
  shown: number;
  total: number;
  hasMore: boolean;
}) {
  if (total === 0) return null;
  return (
    <p className="py-3 text-center font-mono text-[11px] text-muted-foreground">
      {hasMore
        ? `Mostrando ${shown} de ${total} · role para carregar mais`
        : `${total} ${total === 1 ? "item" : "itens"}`}
    </p>
  );
}
