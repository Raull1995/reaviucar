import { useState, useRef } from "react";
import { Upload, X, Image, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface PhotoUploadProps {
  onPhotosUploaded: (photos: File[]) => void;
  maxPhotos: number;
  onNext: () => void;
}

export const PhotoUpload = ({ onPhotosUploaded, maxPhotos, onNext }: PhotoUploadProps) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check user's analysis count
  useEffect(() => {
    const checkAnalysisCount = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('analises')
          .select('id')
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Error checking analysis count:', error);
          return;
        }
        
        const count = data?.length || 0;
        setAnalysisCount(count);
        
        // Block if user has 3 or more analyses (free plan limit)
        if (count >= 3) {
          setIsBlocked(true);
        }
      } catch (error) {
        console.error('Error in checkAnalysisCount:', error);
      }
    };
    
    checkAnalysisCount();
  }, [user]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isBlocked) {
      toast({
        title: "Limite atingido",
        description: "Você atingiu o limite de 3 análises do plano gratuito. Faça upgrade para continuar.",
        variant: "destructive"
      });
      return;
    }
    
    const files = Array.from(event.target.files || []);
    const totalPhotos = photos.length + files.length;

    if (totalPhotos > maxPhotos) {
      toast({
        title: "Limite de fotos excedido",
        description: `Máximo de ${maxPhotos} fotos permitidas`,
        variant: "destructive"
      });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Arquivo inválido",
          description: "Apenas imagens são permitidas",
          variant: "destructive"
        });
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "Máximo de 10MB por imagem",
          variant: "destructive"
        });
        return false;
      }
      return true;
    });

    const newPhotos = [...photos, ...validFiles];
    const newPreviews = [...previews];

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push(e.target?.result as string);
        if (newPreviews.length === newPhotos.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });

    setPhotos(newPhotos);
    onPhotosUploaded(newPhotos);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPreviews(newPreviews);
    onPhotosUploaded(newPhotos);
  };

  const handleNext = () => {
    if (photos.length === 0) {
      toast({
        title: "Fotos necessárias",
        description: "Adicione pelo menos uma foto do veículo",
        variant: "destructive"
      });
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {isBlocked && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-destructive">
            <span className="font-medium">Limite atingido!</span>
          </div>
          <p className="text-sm text-destructive/80 mt-1">
            Você já utilizou suas 3 análises gratuitas. Faça upgrade para o plano profissional para continuar.
          </p>
        </div>
      )}
      
      <div 
        className={`border-2 border-dashed rounded-lg p-3 sm:p-8 text-center transition-colors ${
          isBlocked 
            ? 'border-muted-foreground/10 bg-muted/20 cursor-not-allowed' 
            : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
        }`}
        onClick={() => !isBlocked && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="p-3 sm:p-4 bg-primary/10 rounded-full">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-medium mb-2">
              Adicionar Fotos do Veículo
              {analysisCount > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({analysisCount}/3 análises usadas)
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-base text-muted-foreground mb-4">
              Clique aqui ou arraste as imagens ({photos.length}/{maxPhotos})
            </p>
            <Button variant="outline" type="button" size="sm" className="sm:size-default">
              disabled={isBlocked}
              <Upload className="mr-2 h-4 w-4" />
              {isBlocked ? 'Limite Atingido' : 'Selecionar Fotos'}
            </Button>
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          {previews.map((preview, index) => (
            <Card key={index} className="relative group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <img 
                    src={preview} 
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removePhoto(index)}
                      className="h-6 w-6 sm:h-8 sm:w-8"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/70 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded text-xs">
                    Foto {index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <Image className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-xs sm:text-sm">
              <h4 className="font-medium mb-1">Dicas para melhores fotos:</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>• Fotografe em boa iluminação</li>
                <li>• Capture diferentes ângulos do veículo</li>
                <li>• Inclua detalhes importantes como rodas e para-choques</li>
                <li>• Evite reflexos e sombras excessivas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button 
          onClick={handleNext}
          disabled={photos.length === 0}
          size="sm"
          className="w-full sm:w-auto sm:min-w-32 sm:size-lg"
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};