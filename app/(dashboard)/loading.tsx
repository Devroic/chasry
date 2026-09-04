import { RouteSpinner } from "@/components/route-spinner";

// Matches every nested per-route loading.tsx, so handing off to one doesn't move the spinner.
export default function DashboardLoading() {
  return <RouteSpinner />;
}
