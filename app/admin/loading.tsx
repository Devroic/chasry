import { RouteSpinner } from "@/components/route-spinner";

// Matches the nested per-route spinners so sequential boundaries read as one.
export default function Loading() {
  return <RouteSpinner />;
}
