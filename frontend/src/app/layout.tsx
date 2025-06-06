import type { Metadata } from 'next';
import { Montserrat, Oswald } from 'next/font/google';
import './globals.css';

const montserrat = Montserrat({
    variable: '--font-montserrat',
    subsets: ['latin'],
});

const oswald = Oswald({
    variable: '--font-oswald',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Image scanner',
    description: 'Scan image media for additional information and classifications.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${montserrat.variable} ${oswald.variable} antialiased`}>{children}</body>
        </html>
    );
}
