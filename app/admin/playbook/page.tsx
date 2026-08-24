import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Playbook" };

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
      {children}
    </code>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export default function AdminPlaybookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Stripe Playbook</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick reference for handling a subscriber billing request. Every action below happens
          directly in the{" "}
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline"
          >
            Stripe Dashboard
          </a>
          . This page is steps only, it does not change anything itself.
        </p>
      </div>

      <Section title="Cancel a subscription">
        <p>
          Prefer letting them self serve: Settings, then Billing, then <Kbd>Manage billing</Kbd> in
          the app opens the Customer Portal, which already lets them cancel at period end.
        </p>
        <p>To do it for them: Dashboard, Customers, find them, open the subscription, then the menu.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Choose Cancel subscription.</li>
          <li>
            Pick <strong>cancel at period end</strong> (usual choice, they keep Pro until the
            period they paid for ends) or <strong>cancel immediately</strong>.
          </li>
        </ol>
        <p>Either way they drop to the free plan, never locked out of the app entirely.</p>
      </Section>

      <Section title="Pause a subscription">
        <p className="font-medium text-foreground">
          Pausing stops billing. It does not revoke Pro access in the app.
        </p>
        <p>
          The subscription status stays active while paused, so they keep unlimited invoices the
          whole time. Use this only when the intent is to stop charging them while leaving
          everything else as is. If they should actually lose access, cancel instead.
        </p>
        <p>
          Dashboard, Customer, subscription, then the menu, then <Kbd>Pause payments</Kbd>. Resume
          the same way.
        </p>
      </Section>

      <Section title="Extend a subscription">
        <p className="font-medium text-foreground">
          Use a balance credit, not a second coupon. Coupons do not stack.
        </p>
        <p>
          Dashboard, Customer, Balance, add a negative amount, one month is minus ten euros, two
          months is minus twenty. Stripe automatically applies it to whatever invoice comes due
          next. The Billing page in the app picks this up on its own, nothing else to do.
        </p>
        <p>
          A coupon (Product catalog, Coupons, percent off, repeating duration) works for a
          fixed-length discount, but a second coupon on top of an existing one does not add its
          months on top. Only the balance credit reliably stacks.
        </p>
      </Section>

      <Section title="Gift a subscription">
        <p className="font-medium text-foreground">
          Best option: give them a promo code and have them redeem it themselves.
        </p>
        <p>
          Create a Coupon (100 percent off, forever for a permanent gift or repeating for a set
          number of months), then a Promotion Code from it, and send them the code to enter at
          checkout when they click <Kbd>Upgrade to Pro</Kbd> in the app. This goes through the real
          checkout flow and links their account correctly, no extra steps needed.
        </p>
        <p className="font-medium text-foreground">
          If it needs to be fully hands off instead, order matters:
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            On their{" "}
            <Link href="/admin/users" className="text-brand-primary hover:underline">
              user page
            </Link>
            , link their Stripe customer ID first, before creating the subscription.
          </li>
          <li>Then create the subscription in Stripe and attach the coupon.</li>
        </ol>
        <p>
          The app only recognizes which Stripe customer belongs to which account through that
          link. Creating the subscription first leaves it unmatched, and their access never
          updates.
        </p>
      </Section>

      <Section title="Refunds">
        <p>
          Dashboard, Payments, find the charge, then Refund, full or partial. A refund does not
          cancel the subscription on its own. If they should also lose access, cancel it
          separately.
        </p>
      </Section>

      <Section title="Other things worth knowing">
        <ul className="list-disc space-y-1 pl-5">
          <li>Card updates and invoice history are self service via the Customer Portal, no action needed.</li>
          <li>
            Past due still counts as Pro in the app. That is the retry grace period Stripe already
            gives them, not a cutoff. Nudge them to update their card via the Portal if it drags on.
          </li>
          <li>
            Billing email is a separate field on the Stripe Customer from their Chasry login email.
            Update it directly on the customer if they ask.
          </li>
          <li>Do not edit the live Pro price. Create a new price and migrate deliberately if it ever needs to change.</li>
        </ul>
      </Section>
    </div>
  );
}
