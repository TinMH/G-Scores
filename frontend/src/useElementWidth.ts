import { useEffect, useState } from 'react';

/**
 * Width (px) of an element, kept up to date with a ResizeObserver. Layout decisions about a chart or a card depend on
 * the room that element actually has, which differs from the screen width (a sidebar, padding and cards all take some).
 *
 * Returns a callback ref (so it also works for elements that mount later, e.g. after data has loaded) and the width,
 * which is 0 until the element has been measured.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, width] as const;
}
