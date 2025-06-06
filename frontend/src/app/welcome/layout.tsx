import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Image scanner',
    description: 'Scan image media for additional information and classifications.',
};

export default function WelcomeLayout({
    children,
    modal,
}: Readonly<{
    children: React.ReactNode;
    modal: React.ReactNode;
}>) {
    return (
        <>
            {modal}
            {children}
        </>
    );
}
