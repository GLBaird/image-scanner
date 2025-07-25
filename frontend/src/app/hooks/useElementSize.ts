import { useEffect, useRef, useState } from 'react';

export function useElementSize<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!ref.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === ref.current) {
                    const { width, height } = entry.contentRect;
                    setSize({ width, height });
                }
            }
        });

        observer.observe(ref.current);

        return () => observer.disconnect();
    }, []);

    return [ref, size] as const;
}
