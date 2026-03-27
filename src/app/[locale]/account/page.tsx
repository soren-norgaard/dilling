"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function AccountPage() {
  const tc = useTranslations("common");

  const links = [
    { href: "/orders", label: tc("orders"), icon: "📦" },
    { href: "/catalog", label: tc("catalog"), icon: "🛍️" },
    { href: "/chat", label: "AI Assistent", icon: "💬" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">{tc("account")}</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <span className="text-2xl">{link.icon}</span>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-foreground">{link.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface-raised p-6">
        <h2 className="text-lg font-semibold text-foreground">Sprog & Valuta</h2>
        <p className="mt-2 text-sm text-brand-accent">
          Dansk (DKK) — Standard
        </p>
      </div>
    </div>
  );
}
