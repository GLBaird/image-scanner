'use client';
import logger from '@/lib/logger';
import { useEffect, useState } from 'react';

export function useSSE<T = unknown>(url: string) {
    const [data, setData] = useState<T | null>(null);

    useEffect(() => {
        if (!url) return;
        const es = new EventSource(url);

        es.onmessage = (evt) => setData(JSON.parse(evt.data));
        es.onerror = (err) => {
            logger.error('useSSE', '', 'SSE error', err);
            es.close(); // optional – auto-reconnect is the default
        };

        return () => es.close();
    }, [url]);

    return data;
}
