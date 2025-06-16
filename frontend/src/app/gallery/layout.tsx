import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
    title: 'Image scanner - Gallery',
    description: 'Scan image media for additional information and classifications.',
};

export default async function GalleryLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            <Header />
            {children}
        </div>
    );
}
