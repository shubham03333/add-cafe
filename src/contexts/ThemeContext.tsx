'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'default' | 'blue' | 'green' | 'dark' | 'light' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themeColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    card: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfig = {
  default: {
    primary: 'red',
    secondary: 'orange',
    accent: 'amber',
    background: 'gray',
    text: 'gray',
    card: 'white',
    border: 'gray',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  },
  blue: {
    primary: 'blue',
    secondary: 'indigo',
    accent: 'cyan',
    background: 'slate',
    text: 'slate',
    card: 'white',
    border: 'slate',
    success: 'emerald',
    warning: 'amber',
    error: 'rose',
  },
  green: {
    primary: 'green',
    secondary: 'emerald',
    accent: 'lime',
    background: 'stone',
    text: 'stone',
    card: 'white',
    border: 'stone',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  },
  dark: {
    primary: 'violet',
    secondary: 'purple',
    accent: 'fuchsia',
    background: 'gray',
    text: 'gray',
    card: 'gray',
    border: 'gray',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  },
  light: {
    primary: 'blue',
    secondary: 'indigo',
    accent: 'cyan',
    background: 'gray',
    text: 'gray',
    card: 'white',
    border: 'gray',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  },
  auto: {
    primary: 'red',
    secondary: 'orange',
    accent: 'amber',
    background: 'gray',
    text: 'gray',
    card: 'white',
    border: 'gray',
    success: 'green',
    warning: 'yellow',
    error: 'red',
  },
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('default');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('dashboard-theme') as Theme;
    if (savedTheme && Object.keys(themeConfig).includes(savedTheme) && savedTheme !== 'dark' && savedTheme !== 'auto') {
      setTheme(savedTheme);
    } else {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    // Apply theme class to document and set CSS variables
    const effectiveTheme = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    
    // Set CSS custom properties for theme colors
    const colors = themeConfig[effectiveTheme];
    Object.entries(colors).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--theme-${key}`, value);
    });
  }, [theme]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('dashboard-theme', newTheme);
  };

  // Get the effective theme (if auto, detect system preference)
  const getEffectiveTheme = (): Exclude<Theme, 'auto'> => {
    if (theme === 'auto' || theme === 'dark') {
      return 'light';
    }
    return theme as Exclude<Theme, 'auto'>;
  };

  const effectiveTheme = getEffectiveTheme();
  const themeColors = themeConfig[effectiveTheme];

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
