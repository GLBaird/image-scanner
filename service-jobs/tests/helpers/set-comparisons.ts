/**
 * Returns true when `superset` contains every element of `subset`.
 */
export function isSuperset<T>(
    superset: ReadonlySet<T>,
    subset: ReadonlySet<T>,
): boolean {
    for (const value of subset) {
        if (!superset.has(value)) return false;
    }
    return true;
}

/**
 * Logical negation of `isSuperset`.
 * Returns true when at least one element of `subset`
 * is missing from `superset`.
 */
export const notSuperset = <T>(
    superset: ReadonlySet<T>,
    subset: ReadonlySet<T>,
): boolean => !isSuperset(superset, subset);
