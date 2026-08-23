import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Loader2 className="size-6 animate-spin text-brand-primary" aria-label="Loading" />
    </div>
  );
}
