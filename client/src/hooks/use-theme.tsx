import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Initialize theme from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        setThemeState(stored);
      } else {
        // Check system preference if no stored theme
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemeState(systemPrefersDark ? "dark" : "light");
      }
    } catch (error) {
      // If localStorage is not available, default to light
      setThemeState("light");
    }
  }, []);

  // Update document class and localStorage when theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      // localStorage might not be available
      console.warn("Could not save theme to localStorage:", error);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}