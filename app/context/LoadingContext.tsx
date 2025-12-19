"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LoadingContext = createContext({
  isLoading: true,
  setIsLoading: (value: boolean) => {},
});

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  // Default to TRUE so the splash screen shows immediately on refresh
  const [isLoading, setIsLoading] = useState(true);

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);