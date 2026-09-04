import { FullScreenSpinner } from "@/components/full-screen-spinner";

// Root fallback for top-level routes without their own loading.tsx; they all read auth or invoice
// state before first paint.
export default function Loading() {
  return <FullScreenSpinner />;
}
