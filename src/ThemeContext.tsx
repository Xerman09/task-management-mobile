import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, ThemeId, ThemePalette, THEMES } from './theme';

const THEME_STORAGE_KEY = '@taskflow_theme_id';

interface ThemeContextValue {
  themeId: ThemeId;
  colors: ThemePalette;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'dark',
  colors: COLORS,
  setThemeId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('dark');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (mounted && saved && saved in THEMES) {
          setThemeIdState(saved as ThemeId);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setThemeId = (id: ThemeId) => {
    setThemeIdState(id);
    AsyncStorage.setItem(THEME_STORAGE_KEY, id).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        themeId,
        colors: THEMES[themeId].colors,
        setThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

