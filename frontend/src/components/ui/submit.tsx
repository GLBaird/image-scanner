import { Button } from '@/components/ui/button';
import { Loader2 as LoaderIcon } from 'lucide-react';

type SubmitButtonProps = {
    label?: string;
    processing: boolean;
};

export default function SubmitButton({ label = 'Submit', processing }: SubmitButtonProps) {
    return (
        <Button type="submit" disabled={processing}>
            {processing ? 'Submitting...' : label}
            {processing && <LoaderIcon className="animate-spin" />}
        </Button>
    );
}
