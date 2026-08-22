"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccount } from "./actions";

export function DangerZone() {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Permanently delete your account, clients, invoices, and reminder history. This
          can&rsquo;t be undone.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" className="shrink-0">
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your Chasry account?</DialogTitle>
              <DialogDescription>
                This permanently deletes your account, every client, every invoice, and all
                reminder history, and cancels your subscription immediately. There&rsquo;s no
                undo.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => startTransition(async () => deleteAccount())}
              >
                {pending ? "Deleting…" : "Yes, delete everything"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
