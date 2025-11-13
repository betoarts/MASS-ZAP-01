"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Profile } from "@/lib/profile-storage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";

const formSchema = z.object({
  first_name: z.string().min(1, { message: "Primeiro nome é obrigatório." }).optional().or(z.literal("")),
  last_name: z.string().min(1, { message: "Sobrenome é obrigatório." }).optional().or(z.literal("")),
  avatar_url: z.string().url({ message: "URL do avatar inválida." }).optional().or(z.literal("")),
});

interface ProfileFormProps {
  initialData?: Profile | null;
  onSave: (profile: Omit<Profile, 'id' | 'updated_at'>) => void;
  isLoading: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSave, isLoading }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      avatar_url: initialData?.avatar_url || "",
    },
  });

  React.useEffect(() => {
    form.reset({
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      avatar_url: initialData?.avatar_url || "",
    });
  }, [initialData, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    onSave(values as Omit<Profile, 'id' | 'updated_at'>);
  }

  const avatarUrl = form.watch("avatar_url");
  const firstName = form.watch("first_name");
  const lastName = form.watch("last_name");

  const getInitials = (first?: string, last?: string) => {
    const f = first ? first.charAt(0) : '';
    const l = last ? last.charAt(0) : '';
    return (f + l).toUpperCase();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="Avatar" />
            ) : (
              <AvatarFallback>
                {firstName || lastName ? getInitials(firstName, lastName) : <UserIcon className="h-12 w-12 text-muted-foreground" />}
              </AvatarFallback>
            )}
          </Avatar>
          <FormField
            control={form.control}
            name="avatar_url"
            render={({ field }) => (
              <FormItem className="w-full max-w-sm">
                <FormLabel>URL do Avatar</FormLabel>
                <FormControl>
                  <Input placeholder="https://exemplo.com/avatar.jpg" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primeiro Nome</FormLabel>
              <FormControl>
                <Input placeholder="João" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sobrenome</FormLabel>
              <FormControl>
                <Input placeholder="Silva" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading || form.formState.isSubmitting}>
          {isLoading || form.formState.isSubmitting ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </form>
    </Form>
  );
};