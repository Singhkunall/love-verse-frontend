import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('app_theme') || 'rose');

  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    const root = document.documentElement;
    root.classList.remove('theme-rose', 'theme-dark', 'theme-gold');
    root.classList.add(`theme-${theme}`);

    if (theme === 'dark') {
      document.body.classList.add('dark', 'bg-slate-950', 'text-white');
    } else {
      document.body.classList.remove('dark', 'bg-slate-950', 'text-white');
    }
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
