"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner'; // Import toast for user feedback

interface SessionContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      setIsLoading(false);

      // If signed out or no current session, redirect to login
      if (event === 'SIGNED_OUT' || !currentSession) {
        setSession(null);
        setUser(null);
        toast.error("Sua sessão expirou ou é inválida. Por favor, faça login novamente.");
        navigate('/login');
      }
    });

    // Fetch initial session
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        setSession(initialSession);
        setUser(initialSession?.user || null);
        setIsLoading(false);
        if (!initialSession) {
          navigate('/login');
        }
      })
      .catch((error) => {
        console.error("Error fetching initial session:", error);
        toast.error("Erro ao carregar a sessão. Por favor, faça login novamente.");
        setSession(null);
        setUser(null);
        setIsLoading(false);
        navigate('/login');
      });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <SessionContext.Provider value={{ session, user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};