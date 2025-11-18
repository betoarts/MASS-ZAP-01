"use client";

import * as React from "react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getProfile, updateProfile, Profile } from "@/lib/profile-storage";
import { useSession } from "@/components/auth/SessionContextProvider";
import { toast } from "sonner";
import { RequireSubscription } from "@/components/auth/RequireSubscription";

const ProfilePage = () => {
  const { user, isLoading: isSessionLoading } = useSession();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchProfile = React.useCallback(async () => {
    if (user) {
      setIsLoading(true);
      const fetchedProfile = await getProfile(user.id);
      setProfile(fetchedProfile);
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!isSessionLoading && user) {
      fetchProfile();
    } else if (!isSessionLoading && !user) {
      setIsLoading(false); // No user, no profile to load
    }
  }, [user, isSessionLoading, fetchProfile]);

  const handleSaveProfile = async (updatedData: Omit<Profile, 'id' | 'updated_at'>) => {
    if (!user) {
      toast.error("Você precisa estar logado para atualizar o perfil.");
      return;
    }

    setIsLoading(true);
    const savedProfile = await updateProfile(user.id, { id: user.id, ...updatedData });
    if (savedProfile) {
      setProfile(savedProfile);
      toast.success("Perfil atualizado com sucesso!");
    } else {
      toast.error("Falha ao atualizar o perfil.");
    }
    setIsLoading(false);
  };

  if (isSessionLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando perfil...</div>;
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Faça login para ver seu perfil.</div>;
  }

  return (
    <RequireSubscription>
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-center">Meu Perfil</h1>
      <ProfileForm initialData={profile} onSave={handleSaveProfile} isLoading={isLoading} />
    </div>
    </RequireSubscription>
  );
};

export default ProfilePage;