import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { ReadonlyURLSearchParams } from 'next/navigation';

export function setUrlParams(
    values: { pathname: string; key: string; value: string; searchParams: ReadonlyURLSearchParams },
    router: AppRouterInstance,
    scroll: boolean = false,
) {
    const params = new URLSearchParams(values.searchParams);
    params.set(values.key, values.value);
    router.replace(`${values.pathname}?${params.toString()}`, { scroll });
}
