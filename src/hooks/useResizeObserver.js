

import { useEffect } from "react";
export const useResizeObserver = (ref, callback) => {
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        callback(entry.contentRect);
      }
    });
    const node = ref.current;
    if (node) {
      observer.observe(node);
    }
    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [ref, callback]);
};




