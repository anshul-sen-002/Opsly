import { ListTodo } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/states";

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={ListTodo} title="Tasks" subtitle="Jobs and assignments" />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <EmptyState
          icon={ListTodo}
          title="Tasks coming soon"
          description="Job management is the next feature on the roadmap. Check back shortly."
        />
      </div>
    </div>
  );
}
