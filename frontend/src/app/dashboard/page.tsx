import DashboardImage from '@/assets/dashboard.png';

export default async function Dashboard() {
    return (
        <main className="m-10">
            <p>Welcome to the dashboard...</p>
            <div
                style={{ backgroundImage: `url(\"${DashboardImage.src}\")` }}
                className="h-80 md:h-120 
                           bg-no-repeat bg-cover bg-bottom my-5"
            />
            <p>Control your scanning jobs, users and monitor scan progress...</p>
        </main>
    );
}
