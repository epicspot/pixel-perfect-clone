import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InterfaceTheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
  sidebar: string;
}

export const interfaceThemes: InterfaceTheme[] = [
  { id: 'orange', name: 'Orange (Défaut)', primary: '24 95% 53%', accent: '180 60% 40%', sidebar: '220 25% 12%' },
  { id: 'blue', name: 'Bleu', primary: '220 70% 50%', accent: '200 80% 45%', sidebar: '220 30% 10%' },
  { id: 'emerald', name: 'Émeraude', primary: '160 60% 45%', accent: '180 50% 40%', sidebar: '160 30% 10%' },
  { id: 'purple', name: 'Violet', primary: '270 60% 55%', accent: '290 50% 45%', sidebar: '270 30% 12%' },
  { id: 'rose', name: 'Rose', primary: '340 75% 55%', accent: '320 60% 50%', sidebar: '340 25% 12%' },
  { id: 'amber', name: 'Ambre', primary: '38 90% 50%', accent: '30 80% 45%', sidebar: '30 25% 12%' },
  { id: 'teal', name: 'Sarcelle', primary: '180 60% 45%', accent: '170 50% 40%', sidebar: '180 30% 10%' },
  { id: 'red', name: 'Rouge', primary: '0 70% 50%', accent: '15 60% 45%', sidebar: '0 25% 12%' },
];

const applyTheme = (theme: InterfaceTheme) => {
  const root = document.documentElement;
  
  // Light mode
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--sidebar-background', theme.sidebar);
  root.style.setProperty('--ring', theme.primary);
  root.style.setProperty('--sidebar-ring', theme.primary);
  
  // Also update dark mode primary slightly brighter
  const hslParts = theme.primary.split(' ');
  if (hslParts.length === 3) {
    const lightness = parseFloat(hslParts[2]);
    const darkPrimary = `${hslParts[0]} ${hslParts[1]} ${Math.min(lightness + 5, 70)}%`;
    root.style.setProperty('--primary-dark', darkPrimary);
  }
};

export const useInterfaceTheme = () => {
  const queryClient = useQueryClient();
  const [currentThemeId, setCurrentThemeId] = useState<string>('orange');

  // Fetch saved theme from app_settings
  const { data: savedTheme, isLoading } = useQuery({
    queryKey: ['interface-theme'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'interface_theme')
        .maybeSingle();
      if (error) throw error;
      return data?.value || 'orange';
    },
  });

  // Apply theme when it loads or changes
  useEffect(() => {
    if (savedTheme) {
      setCurrentThemeId(savedTheme);
      const theme = interfaceThemes.find(t => t.id === savedTheme) || interfaceThemes[0];
      applyTheme(theme);
    }
  }, [savedTheme]);

  // Apply theme on initial load from localStorage for instant feedback
  useEffect(() => {
    const cached = localStorage.getItem('interface-theme');
    if (cached) {
      const theme = interfaceThemes.find(t => t.id === cached) || interfaceThemes[0];
      applyTheme(theme);
      setCurrentThemeId(cached);
    }
  }, []);

  // Save theme mutation
  const saveTheme = useMutation({
    mutationFn: async (themeId: string) => {
      // Cache in localStorage for instant apply on next load
      localStorage.setItem('interface-theme', themeId);
      
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', 'interface_theme')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('app_settings')
          .update({ value: themeId, updated_at: new Date().toISOString() })
          .eq('key', 'interface_theme');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .insert({ key: 'interface_theme', value: themeId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interface-theme'] });
    },
  });

  const setTheme = (themeId: string) => {
    const theme = interfaceThemes.find(t => t.id === themeId) || interfaceThemes[0];
    applyTheme(theme);
    setCurrentThemeId(themeId);
    saveTheme.mutate(themeId);
  };

  return {
    currentThemeId,
    themes: interfaceThemes,
    setTheme,
    isLoading,
    isSaving: saveTheme.isPending,
  };
};
