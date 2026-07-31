import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Default true so logged-out pages (Login/Register) still look right before
  // we know the user's saved preference.
  const [darkMode, setDarkMode] = useState(true);

  // Load the user's saved preference once they're authenticated
  useEffect(() => {
    const loadTheme = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await api.get('/settings');
        setDarkMode(response.data.settings.darkMode);
      } catch (error) {
        // Not logged in yet, or settings not reachable - keep the default
      }
    };
    loadTheme();
  }, []);

  // Apply the "dark" class to <html> whenever darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = async () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      await api.put('/settings', { darkMode: next });
    } catch (error) {
      // UI already updated optimistically; persistence failing isn't critical here
    }
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>{children}</ThemeContext.Provider>
  );
};
