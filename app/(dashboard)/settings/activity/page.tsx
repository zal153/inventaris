import { getActivityLogs } from "@/actions/settings.actions";
import { ActivityListClient } from "@/components/settings/ActivityListClient";

export const metadata = {
  title: "Audit Log Aktivitas",
};

export default async function ActivityLogPage() {
  const logs = await getActivityLogs();

  return (
    <div className="animate-fade-in">
      <ActivityListClient logs={logs as any} />
    </div>
  );
}
