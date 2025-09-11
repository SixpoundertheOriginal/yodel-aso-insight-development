import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchWhoAmI, type WhoAmI } from '@/services/authz';

type ServerAuthState = {
  whoami: WhoAmI | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<ServerAuthState>({ whoami: null, loading: true, refresh: async () => {} });

export const ServerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const w = await fetchWhoAmI();
      setWhoami(w);
      const DEMO_DEBUG = (import.meta as any).env?.VITE_DEMO_DEBUG === 'true';
      if (DEMO_DEBUG) {
        // eslint-disable-next-line no-console
        console.debug('[DEMO DEBUG] whoami.features:', w?.features);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <Ctx.Provider value={{ whoami, loading, refresh: load }}>
      {children}
    </Ctx.Provider>
  );
};

export const useServerAuth = () => useContext(Ctx);
