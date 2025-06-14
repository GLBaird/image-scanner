'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Github, Loader2 as Loader } from 'lucide-react';
import Google from '@/assets/google-tile.svg?component';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { SignInInfo, signInSchema } from '@/schemas/SignIn';
import { signInWithCredentials, signInWithGithub, signInWithGoogle } from '@/app/actions/sign-in';
import { useState } from 'react';
import SubmitButton from './ui/submit';
import { makeFieldGuard, processServerFormErrors } from '@/lib/utils';

type SignInFormProps = {
    popupMode?: boolean;
};

export default function SignInForm({ popupMode = false }: SignInFormProps) {
    const [githubPending, setGithubPending] = useState(false);
    const [googlePending, setGooglePending] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);

    const form = useForm<SignInInfo>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    function handleReset() {
        form.reset();
    }

    async function handleGithub() {
        setGithubPending(true);
        setErrors([]);
        await signInWithGithub();
    }

    async function handleGoogle() {
        setGooglePending(true);
        setErrors([]);
        await signInWithGoogle();
    }

    async function handleSubmit(formData: SignInInfo) {
        setErrors([]);
        const response = await signInWithCredentials(formData);
        const isField = makeFieldGuard('email', 'password');
        const { newErrors, formErrors } = processServerFormErrors(response, isField);
        setErrors(newErrors);
        formErrors.forEach((error) => form.setError(error.field, { message: error.message }));
    }

    return (
        <>
            <div className="responsive-button-strip">
                <Button
                    className="text-2xl py-8 hover-button"
                    size="lg"
                    title="Sign in with Github"
                    onClick={handleGithub}
                    disabled={githubPending}
                    asChild
                >
                    <div>
                        <Github className="size-10" />
                        {githubPending ? <Loader className="animate-spin size-7 mx-3" /> : 'Github'}
                    </div>
                </Button>

                <Button
                    className="text-2xl py-8 hover-button"
                    size="lg"
                    title="Sign in with Google"
                    onClick={handleGoogle}
                    disabled={googlePending}
                    asChild
                >
                    <div>
                        <Google className="size-11" />
                        {googlePending ? <Loader className="animate-spin size-7 mx-3" /> : 'Google'}
                    </div>
                </Button>
            </div>
            <hr className="mt-5 mb-8" />

            <p className="mb-5">Or enter your credentials:</p>
            <div className="sm:mx-10">
                <Form {...form}>
                    <form className="space-y-8" onSubmit={form.handleSubmit(handleSubmit)} onReset={handleReset}>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="Enter a valid email address" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Enter password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {errors.length > 0 && (
                            <div className="text-red-700">
                                An error has occured:
                                <ul className="pl-3">
                                    {errors.map((message) => (
                                        <li key={message}>- {message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-between gap-5">
                            {(!popupMode && (
                                <Button variant="link">
                                    <Link href="/create-account">Create account</Link>
                                </Button>
                            )) || <div />}

                            <span className="flex gap-5">
                                <Button type="reset" variant="destructive">
                                    Clear
                                </Button>
                                <SubmitButton processing={form.formState.isSubmitting} />
                            </span>
                        </div>
                    </form>
                </Form>
            </div>
        </>
    );
}
