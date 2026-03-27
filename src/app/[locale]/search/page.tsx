"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const tc = useTranslations("common");
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-foreground">{tc("search")}</h1>
      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <Input
          id="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg efter produkter..."
          className="flex-1"
        />
        <Button type="submit">{tc("search")}</Button>
      </form>
    </div>
  );
}
