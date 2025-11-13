"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { ptBR } from '@/lib/supabase-pt-br';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionContextProvider';

function Login() {
  const navigate = useNavigate();
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && session) {
      navigate('/');
    }
  }, [session, isLoading, navigate]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur border border-purple-100/70 dark:border-white/10 px-6 sm:px-8 py-6 shadow-[0_2px_12px_rgba(89,63,255,0.08)]">
          <div className="flex flex-col items-center">
            <img src="/logo.gif" alt="MassZapp Logo" className="h-24 w-auto mb-3" onError={(e) => {
              // fallback para png se gif não existir
              const target = e.target as HTMLImageElement;
              if (target && target.src.endsWith('/logo.gif')) {
                target.src = '/logo.png';
              }
            }} />
            <h2 className="mt-2 text-center text-2xl font-bold text-purple-900 dark:text-purple-100">
              Faça login na sua conta
            </h2>
          </div>
          <div className="mt-6">
            <Auth
              supabaseClient={supabase}
              providers={[]}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(var(--primary))',
                      brandAccent: 'hsl(var(--primary))',
                      inputBackground: 'transparent',
                    },
                  },
                },
                className: {
                  input: 'rounded-md border-purple-100 dark:border-white/10 bg-white/70 dark:bg-white/5',
                  button: 'rounded-md',
                },
              }}
              theme="light"
              redirectTo={window.location.origin}
              localization={{
                variables: ptBR.variables,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;