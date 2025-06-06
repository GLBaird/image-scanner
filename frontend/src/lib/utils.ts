import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Use to normalise data path in ZOD errors
 * @param path      Zod Path, which is usuaully an array, though can be typed as a number of options
 * @param fields    Array of fields in order, incase path is an index number
 */
export function normaliseErrorPath(path: string | number | unknown[], fields: string[]): string {
    return (
        (typeof path === 'string' && (path as string)) ||
        (typeof path === 'number' && fields[path]) ||
        (Array.isArray(path) && (path.shift() as string)) ||
        ''
    );
}

export type FieldError<F extends string> = {
    field: F;
    message: string;
};

export type ServerError<F extends string> = {
    errors: string[] | FieldError<F>[];
};

/**
 * Used to make a guard checker on types submitted for forms with fields
 * @example
 *      const isField = makeFieldGuard('email', 'password');
 * @param lits
 * @returns
 */
export function makeFieldGuard<const L extends readonly string[]>(...lits: L) {
    const set = new Set(lits);
    return (x: unknown): x is L[number] => typeof x === 'string' && set.has(x);
}

/**
 * Type for typing fields as const field: 'email' | 'password';
 * based on field guards made with `makeFieldGuard` above.
 */
type Guarded<G> = G extends (x: unknown) => x is infer U ? U : never;

/**
 * Will process form responses and extract correctly types errors for
 * handling with ZOD validated forms and ZOD errors.
 * Returned values { newErrors, formErrors } are explained as follows:
 *   newErrors are generic errors not related to fields, to be displayed on the bottom of a form
 *   formErrors are typed obnjects to match ZOD fields { field: 'feild1' | 'field2', message: string }
 * @example
 * In the following example, there is a state object for handling errors as string[], and a useForm from react-form-hooks
 * for processing form with ZOD.
 *      const repsonse = await runServerAction();
 *      const isField = makeFieldGuard('email', 'password');
 *      const { newErrors, formErrors } = processServerFormErrors(response, isField);
 *      setErrors(newErrors);
 *      formErrors.forEach(error => form.setError(error.field, { message: error.message }));
 * In the above example:
 *   newErrors = type string[]
 *   formErrors = type { field: 'email' | 'password', message: string }
 * @param response  response from server action
 * @param isField   field guard from `makeFieldGuard(...fields)
 * @returns         typed errors for handling on forms
 */
export function processServerFormErrors<
    G extends (v: unknown) => v is string, // the guard
>(
    response: ServerError<string> | undefined, //  ← changed
    isField: G,
): {
    newErrors: string[];
    formErrors: FieldError<Guarded<G>>[];
} {
    const newErrors: string[] = [];
    const formErrors: FieldError<Guarded<G>>[] = [];

    /* fall-back if the server gave you nothing */
    if (!response || !Array.isArray(response.errors)) {
        newErrors.push('Server error, unable to authenticate');
        return { newErrors, formErrors };
    }

    for (const e of response.errors) {
        if (typeof e === 'string') {
            newErrors.push(e);
            continue;
        }
        if (typeof e.message !== 'string') continue;

        if (!e.field || e.field === 'root' || !isField(e.field)) {
            newErrors.push(e.message);
        } else {
            formErrors.push({ field: e.field as Guarded<G>, message: e.message });
        }
    }

    return { newErrors, formErrors };
}
