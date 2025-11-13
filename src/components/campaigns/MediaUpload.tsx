"use client";

import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Upload, X } from "lucide-react";

interface MediaUploadProps {
  value?: string;
  onChange: (value?: string) => void;
}

const BUCKET_NAME = "campaign_media";

export const MediaUpload: React.FC<MediaUploadProps> = ({ value, onChange }) => {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          // TODO: Find a way to track progress
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      onChange(publicUrl);
      toast({
        title: "Sucesso!",
        description: "Sua mídia foi enviada.",
      });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro no Upload",
        description: error.message || "Não foi possível enviar a mídia.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      // Reset file input
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveMedia = async () => {
    if (!value) return;

    const filePath = value.split(`${BUCKET_NAME}/`)[1];

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      onChange(undefined);
      toast({
        title: "Mídia Removida",
        description: "A mídia foi removida com sucesso.",
      });
    } catch (error: any) {
      console.error("Error removing file:", error);
      toast({
        title: "Erro ao Remover",
        description: error.message || "Não foi possível remover a mídia.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group">
          <div className="rounded-md overflow-hidden">
            {/* Basic preview for different file types */}
            {value.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
              <img src={value} alt="Preview" className="max-h-48 w-auto rounded-md" />
            ) : (
              <div className="p-4 border rounded-md bg-muted">
                <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Ver Mídia
                </a>
              </div>
            )}
          </div>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemoveMedia}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="media-upload-input"
          />
          <label htmlFor="media-upload-input" className="w-full">
            <Button asChild disabled={uploading}>
              <span className="w-full cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? `Enviando... ${progress.toFixed(0)}%` : "Enviar Mídia"}
              </span>
            </Button>
          </label>
        </div>
      )}
      {uploading && <Progress value={progress} className="w-full" />}
    </div>
  );
};