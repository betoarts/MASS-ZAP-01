"use client";

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/components/auth/SessionContextProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

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
            <h2 className="mt-2 text-center text-2xl font-bold text-purple-900 dark:text-purple-100 mb-6">
              Bem-vindo ao MassZapp
            </h2>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default Login;