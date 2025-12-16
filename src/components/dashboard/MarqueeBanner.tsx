import React from 'react';
import { Bus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const MarqueeBanner: React.FC = () => {
  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const companyName = settings?.company_name || 'TRANSPORT BURKINA EXPRESS';
  const slogan = settings?.slogan || 'Votre partenaire de confiance pour tous vos voyages • Sécurité • Confort • Ponctualité';
  const logoUrl = settings?.logo_url;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 dark:from-emerald-700 dark:via-emerald-600 dark:to-teal-600 rounded-2xl shadow-lg border border-emerald-400/30">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-15">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.15)_10px,rgba(255,255,255,0.15)_20px)]" />
      </div>
      
      <div className="relative py-4 flex items-center min-h-[60px]">
        {/* Scrolling content */}
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex items-center mx-8">
              {/* Animated Logo */}
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/25 mr-4 animate-pulse-slow overflow-hidden shadow-md">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
                ) : (
                  <Bus className="w-6 h-6 text-white animate-bounce-slow" />
                )}
              </div>
              
              {/* Company Name */}
              <span className="text-lg md:text-xl font-display font-bold text-white tracking-wide mr-6 drop-shadow-sm">
                {companyName}
              </span>
              
              {/* Separator */}
              <span className="text-white/70 mx-4">✦</span>
              
              {/* Slogan */}
              <span className="text-sm md:text-base text-white/95 font-medium drop-shadow-sm">
                {slogan}
              </span>
              
              {/* Separator */}
              <span className="text-white/70 mx-4">✦</span>
            </div>
          ))}
        </div>
        
        {/* Duplicate for seamless loop */}
        <div className="flex animate-marquee2 whitespace-nowrap absolute top-0 left-0 py-4 min-h-[60px] items-center">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex items-center mx-8">
              {/* Animated Logo */}
              <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/25 mr-4 animate-pulse-slow overflow-hidden shadow-md">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-9 h-9 object-contain" />
                ) : (
                  <Bus className="w-6 h-6 text-white animate-bounce-slow" />
                )}
              </div>
              
              {/* Company Name */}
              <span className="text-lg md:text-xl font-display font-bold text-white tracking-wide mr-6 drop-shadow-sm">
                {companyName}
              </span>
              
              {/* Separator */}
              <span className="text-white/70 mx-4">✦</span>
              
              {/* Slogan */}
              <span className="text-sm md:text-base text-white/95 font-medium drop-shadow-sm">
                {slogan}
              </span>
              
              {/* Separator */}
              <span className="text-white/70 mx-4">✦</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-emerald-600 dark:from-emerald-700 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-teal-500 dark:from-teal-600 to-transparent z-10" />
    </div>
  );
};

export default MarqueeBanner;
