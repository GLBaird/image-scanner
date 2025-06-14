'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {} from 'lucide-react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CreateNewJobInfo, createNewJobSchema } from '@/schemas/CreateNewJob';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import SubmitButton from '@/components/ui/submit';
import { useContext, useState } from 'react';
import { createNewJob } from '@/app/actions/manage-jobs';
import { makeFieldGuard, processServerFormErrors } from '@/lib/utils';
import { JobsDashboardContext } from '@/app/contexts/JobsDashboard';

export const NEW_JOB_ID = '4huIv6N3RgGS_uiL-Rb90';

export default function CreateNewJobForm() {
    const [errors, setErrors] = useState<string[]>([]);
    const { sources } = useContext(JobsDashboardContext);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const form = useForm<CreateNewJobInfo>({
        resolver: zodResolver(createNewJobSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    function handleCancel() {
        router.replace(pathname);
    }

    async function handleCreate(formData: CreateNewJobInfo) {
        setErrors([]);
        const response = await createNewJob(formData);
        const isField = makeFieldGuard('name', 'description', 'source');
        const { newErrors, formErrors } = processServerFormErrors(response, isField);
        setErrors(newErrors);
        formErrors.forEach((error) => form.setError(error.field, { message: error.message }));
        if (newErrors.length === 0 && formErrors.length === 0) {
            router.replace(pathname);
        }
    }

    return (
        <Card className={'dashboard-detail-column'}>
            <CardHeader className="bg-blue-50 py-2 shadow">
                <h2 className="m-0">Create New Job:</h2>
            </CardHeader>
            <CardContent className="dashboard-detail-column-scroll scroll-container">
                <p>Enter details for new job and choose source:</p>
                <div className="sm:mx-10">
                    <Form {...form}>
                        <form className="space-y-8" onSubmit={form.handleSubmit(handleCreate)} onReset={handleCancel}>
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input type="text" placeholder="Enter name for job" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                className="h-25"
                                                placeholder="Description for job..."
                                                maxLength={250}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="source"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>File Source</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Choose file source" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectLabel>Sources</SelectLabel>
                                                        {sources.map((source) => (
                                                            <SelectItem key={source} value={source}>
                                                                {source}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
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
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" type="reset">
                                    Cancel
                                </Button>
                                <SubmitButton label="Create" processing={form.formState.isSubmitting} />
                            </div>
                        </form>
                    </Form>
                </div>
            </CardContent>
        </Card>
    );
}
