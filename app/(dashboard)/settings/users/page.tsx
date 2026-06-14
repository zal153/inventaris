import { getUsers } from "@/actions/settings.actions";
import { UserListClient } from "@/components/settings/UserListClient";

export const metadata = {
  title: "Manajemen Pengguna",
};

export default async function SettingsUsersPage() {
  const users = await getUsers();

  return (
    <div className="animate-fade-in">
      <UserListClient users={users as any} />
    </div>
  );
}
