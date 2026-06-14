import { getSystemInfo } from "@/actions/settings.actions";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata = {
  title: "Pengaturan Sistem",
};

export default async function SettingsPage() {
  const info = await getSystemInfo();

  return (
    <div className="animate-fade-in">
      <SettingsClient info={info} />
    </div>
  );
}
