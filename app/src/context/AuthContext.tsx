import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Anime } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  favorites: (string | number)[];
  history: { animeId: string | number; episode: number; timestamp: number }[];
  login: (token: string, user: User) => void;
  logout: () => void;
  toggleFavorite: (animeId: string | number) => void;
  isFavorite: (animeId: string | number) => boolean;
  saveWatchProgress: (animeId: string | number, episode: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token') || localStorage.getItem('app_token'));
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user') || localStorage.getItem('app_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [favorites, setFavorites] = useState<(string | number)[]>(() => {
    try {
      const saved = localStorage.getItem('anime_favorites');
      return saved ? JSON.parse(saved) : [1, 2];
    } catch {
      return [1, 2];
    }
  });

  const [history, setHistory] = useState<{ animeId: string | number; episode: number; timestamp: number }[]>(() => {
    try {
      const saved = localStorage.getItem('app_watch_history');
      return saved ? JSON.parse(saved) : [
        { animeId: 1, episode: 3, timestamp: Date.now() - 3600000 },
        { animeId: 2, episode: 1, timestamp: Date.now() - 86400000 }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('anime_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('app_watch_history', JSON.stringify(history));
  }, [history]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('app_token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('app_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('app_token');
    localStorage.removeItem('user');
    localStorage.removeItem('app_user');
  };

  const toggleFavorite = (animeId: string | number) => {
    setFavorites(prev => {
      const exists = prev.some(id => String(id) === String(animeId));
      if (exists) {
        return prev.filter(id => String(id) !== String(animeId));
      } else {
        return [...prev, animeId];
      }
    });
  };

  const isFavorite = (animeId: string | number) => {
    return favorites.some(id => String(id) === String(animeId));
  };

  const saveWatchProgress = (animeId: string | number, episode: number) => {
    setHistory(prev => {
      const filtered = prev.filter(h => String(h.animeId) !== String(animeId));
      return [{ animeId, episode, timestamp: Date.now() }, ...filtered].slice(0, 50);
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      favorites,
      history,
      login,
      logout,
      toggleFavorite,
      isFavorite,
      saveWatchProgress
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

