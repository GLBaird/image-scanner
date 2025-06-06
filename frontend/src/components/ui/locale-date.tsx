'use client';

import { useEffect, useState } from 'react';

export default function LocalDate({ iso, date, withTime = false }: { iso?: string; date?: Date; withTime?: boolean }) {
    if (!iso && !date) throw new Error('you need to set either an ISO string or Date Object');

    const [label, setLabel] = useState<string>(() => iso ?? date!.toISOString());

    useEffect(() => {
        const locale = navigator.language;
        const pretty = new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: withTime ? 'short' : undefined,
        }).format(date ?? new Date(iso!));
        setLabel(pretty);
    }, [iso, date, withTime]);

    return <time dateTime={iso}>{label}</time>;
}
