import LogoGraphic from '@/assets/logo.svg?component';

const Logo = () => (
    <div className="responsive-logo">
        <LogoGraphic className="size-30 fill-(--heading-color) sm:size-20 sm:mr-4" />
        <h1 className="mt-2 sm:mt-7 whitespace-nowrap">Image Scanner</h1>
    </div>
);

export default Logo;
