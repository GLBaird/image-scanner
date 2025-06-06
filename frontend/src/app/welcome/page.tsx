import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import heroImage from '@/assets/hero_image.png';
import Logo from '@/assets/logo.svg?component';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import Routes from '@/lib/routes';

export default async function Home() {
    const session = await auth();
    if (session) redirect(Routes.DASHBOARD);

    return (
        <div className="flex justify-center">
            <main className="max-w-[90em] bg-white md:shadow-2xl">
                <div className="hidden md:block h-25 bg-gradient-to-b from-black via-black via-80% to-blue-950" />

                <div className="relative">
                    <Image src={heroImage} alt="Image showing automatic conversion of images to data" priority />

                    <div className="flex flex-col overflow-hidden md:absolute md:inset-0 md:justify-around">
                        <div
                            className="sm:m0 
                                       md:text-right md:pr-30 md:pl-10 md:py-5 md:rounded-l-md md:self-end
                                       md:bg-gradient-to-r md:from-black/60 md:to-black/30
                                      md:border-blue-800 md:border-l-blue-600 md:border-1 md:border-t-blue-400/50 md:border-r-0
                                       md:animate-[slide-in-right_700ms_ease-out_forwards]"
                        >
                            <div className="flex flex-col items-center justify-center mt-5 mb-2 sm:flex-row sm:mb-0">
                                <Logo
                                    className="size-30 fill-(--heading-color) m-0 mb-3
                                                sm:mb-0 sm:mr-5 sm:w-18 sm:h-18
                                                md:w-10 md:h-10 md:fill-white
                                                lg:w-25 lg:h-25"
                                />
                                <h1
                                    className="m-0 text-5l 
                                               sm:text-6xl 
                                               md:text-white md:text-5xl 
                                               lg:text-7xl"
                                >
                                    Image Scanner
                                </h1>
                            </div>
                            <h2
                                className="text-center mt-0 
                                           md:text-right mb-3 md:text-white md:text-2xl 
                                           lg:text-4xl"
                            >
                                Extract data automatically
                            </h2>
                        </div>

                        <div
                            className="mx-10 my-2
                                       md:m-0 md:pl-30 md:pr-10 md:py-5 md:mr-40 md:rounded-r-md md:text-white
                                       md:bg-gradient-to-r md:from-black/20 md:to-black/70
                                       md:border-blue-800 md:border-r-blue-600 md:border-1 md:border-l-0 md:border-t-blue-400/50
                                       md:animate-[slide-in-left_500ms_ease-out_backwards] md:[animation-delay:800ms]"
                        >
                            <p className="text-1xl lg:text-2xl">
                                Automatically scan image collections from your local file system, and extract available
                                data. Exif, Metadata, Location, Faces and Object&nbsp;Classifications.
                            </p>
                            <p className="text-1xl lg:text-2xl">Compatible with JPEG, PNG and GIFF.</p>
                        </div>

                        <div
                            className="flex flex-col gap-5 my-5 mx-20 
                                        md:m-0 md:flex-row md:justify-end md:gap-10 md:pr-20 md:pt-10 
                                        md:border-t-1 md:border-t-blue-400 
                                        md:bg-gradient-to-b md:from-black/70 to-black/0
                                        md:animate-[slide-up_800ms_ease-out_backwards] md:[animation-delay:1.2s]"
                        >
                            <Button className="text-2xl py-5">
                                <Link href={Routes.CREATE_ACCOUNT}>Create account</Link>
                            </Button>
                            <Button className="text-2xl py-5">
                                <Link href={Routes.SIGN_IN}>Sign in</Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="text-center my-10">&copy; Copyright Leon Baird, 2025</div>
            </main>
        </div>
    );
}
