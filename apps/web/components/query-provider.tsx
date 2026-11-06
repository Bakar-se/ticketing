"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { makeQueryClient, onUnauthorized } from "@/lib/api";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient);
  const router = useRouter();

  // The session ended mid-visit: drop what this person could see and send
  // them to sign in, coming back to the page they were on
  useEffect(() => {
    onUnauthorized(() => {
      client.clear();
      const here = `${window.location.pathname}${window.location.search}`;
      router.replace(`/signin?next=${encodeURIComponent(here)}`);
    });
    return () => onUnauthorized(null);
  }, [client, router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
