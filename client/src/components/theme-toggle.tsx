import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/use-theme";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "default" | "lg";
}

export default function ThemeToggle({ className = "", size = "default" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleTheme}
      className={`transition-all duration-300 hover:scale-105 ${className}`}
      data-testid="button-theme-toggle"
      title={theme === "light" ? "التبديل إلى الوضع الليلي" : "التبديل إلى الوضع النهاري"}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4 text-yellow-500" />
      )}
      <span className="sr-only">
        {theme === "light" ? "التبديل إلى الوضع الليلي" : "التبديل إلى الوضع النهاري"}
      </span>
    </Button>
  );
}