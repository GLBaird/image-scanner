import { getCorrId } from '@/lib/corr-id';
import { getUsers } from '@/data-access/user';
import UserList from '@/components/UserList';
import CacheTags from '@/lib/cache-tags';

export const revalidate = 300;
export const fetchCacheTags = [CacheTags.users];

export default async function DashboardUsers() {
    const corrId = await getCorrId();

    // UI is limited to 200 users, but could be paged if needed
    // however, app is designed for mainly single users or small groups
    const users = await getUsers(200, undefined, corrId);

    return (
        <main>
            <UserList users={users} />
        </main>
    );
}
