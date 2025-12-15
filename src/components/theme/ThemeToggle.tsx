import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "default" | "compact";
}

export function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  if (variant === "compact") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={cn(
          "relative overflow-hidden",
          "transition-all duration-300 ease-out",
          className
        )}
      >
        <Sun className={cn(
          "h-5 w-5 transition-all duration-300",
          theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        )} />
        <Moon className={cn(
          "absolute h-5 w-5 transition-all duration-300",
          theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
        )} />
        <span className="sr-only">Basculer le thème</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative overflow-hidden",
            "transition-all duration-300 ease-out",
            className
          )}
        >
          <Sun className={cn(
            "h-5 w-5 transition-all duration-500",
            theme === "dark" ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
          )} />
          <Moon className={cn(
            "absolute h-5 w-5 transition-all duration-500",
            theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
          )} />
          <span className="sr-only">Basculer le thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={cn(
            "gap-2 cursor-pointer",
            theme === "light" && "bg-muted"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Clair</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={cn(
            "gap-2 cursor-pointer",
            theme === "dark" && "bg-muted"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Sombre</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={cn(
            "gap-2 cursor-pointer",
            theme === "system" && "bg-muted"
          )}
        >
          <span className="h-4 w-4 flex items-center justify-center text-xs">🖥️</span>
          <span>Système</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
