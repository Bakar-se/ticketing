"use client";

import { createContext, useContext, useState } from "react";

export type TicketChrome = {
  section: "board" | "backlog";
  ticketKey: string;
};

type TicketChromeValue = {
  chrome: TicketChrome | null;
  setChrome: (chrome: TicketChrome | null) => void;
};

const TicketChromeContext = createContext<TicketChromeValue | null>(null);

export function TicketChromeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chrome, setChrome] = useState<TicketChrome | null>(null);
  return (
    <TicketChromeContext.Provider value={{ chrome, setChrome }}>
      {children}
    </TicketChromeContext.Provider>
  );
}

export function useTicketChrome() {
  const value = useContext(TicketChromeContext);
  if (!value) {
    throw new Error("Ticket chrome is only available inside a project");
  }
  return value;
}
