import React from 'react';
import { Bus } from 'lucide-react';

const MarqueeBanner: React.FC = () => {
  const companyName = "TRANSPORT BURKINA EXPRESS";
  const slogan = "Votre partenaire de confiance pour tous vos voyages • Sécurité • Confort • Ponctualité";

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-primary rounded-2xl mb-6 shadow-lg">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
      </div>
      
      <div className="relative py-3 flex items-center">
        {/* Scrolling content */}
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex items-center mx-8">
              {/* Animated Logo */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/20 mr-4 animate-pulse-slow">
                <Bus className="w-6 h-6 text-primary-foreground animate-bounce-slow" />
              </div>
              
              {/* Company Name */}
              <span className="text-lg md:text-xl font-display font-bold text-primary-foreground tracking-wide mr-6">
                {companyName}
              </span>
              
              {/* Separator */}
              <span className="text-primary-foreground/60 mx-4">✦</span>
              
              {/* Slogan */}
              <span className="text-sm md:text-base text-primary-foreground/90 font-medium">
                {slogan}
              </span>
              
              {/* Separator */}
              <span className="text-primary-foreground/60 mx-4">✦</span>
            </div>
          ))}
        </div>
        
        {/* Duplicate for seamless loop */}
        <div className="flex animate-marquee2 whitespace-nowrap absolute top-0 left-0 py-3">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="flex items-center mx-8">
              {/* Animated Logo */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-foreground/20 mr-4 animate-pulse-slow">
                <Bus className="w-6 h-6 text-primary-foreground animate-bounce-slow" />
              </div>
              
              {/* Company Name */}
              <span className="text-lg md:text-xl font-display font-bold text-primary-foreground tracking-wide mr-6">
                {companyName}
              </span>
              
              {/* Separator */}
              <span className="text-primary-foreground/60 mx-4">✦</span>
              
              {/* Slogan */}
              <span className="text-sm md:text-base text-primary-foreground/90 font-medium">
                {slogan}
              </span>
              
              {/* Separator */}
              <span className="text-primary-foreground/60 mx-4">✦</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-primary to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-primary to-transparent z-10" />
    </div>
  );
};

export default MarqueeBanner;
