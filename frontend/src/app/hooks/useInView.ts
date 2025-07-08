import { useEffect, useRef, useState } from 'react';

type UseInViewOptions = {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number;
};

export function useInView<T extends HTMLElement>(options?: UseInViewOptions): [React.RefObject<T | null>, boolean] {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setInView(entry.isIntersecting);
            },
            {
                root: options?.root || null,
                rootMargin: options?.rootMargin || '0px',
                threshold: options?.threshold ?? 1.0,
            },
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [ref, options?.root, options?.rootMargin, options?.threshold]);

    return [ref, inView];
}
