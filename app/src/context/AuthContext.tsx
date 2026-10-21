import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isGuest: boolean;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  continueAsGuest: () => void;
  login: (token: string, user: User) => void;
  logout: () => void;
  favorites: (string | number)[];
  history: { animeId: string | number; episode: number; timestamp: number }[];
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

  const [isGuest, setIsGuest] = useState<boolean>(() => {
    return sessionStorage.getItem('app_guest_mode') === 'true';
  });

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

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

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setIsGuest(false);
    sessionStorage.removeItem('app_guest_mode');
    localStorage.setItem('token', newToken);
    localStorage.setItem('app_token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('app_user', JSON.stringify(newUser));
    setShowAuthModal(false);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsGuest(false);
    sessionStorage.removeItem('app_guest_mode');
    localStorage.removeItem('token');
    localStorage.removeItem('app_token');
    localStorage.removeItem('user');
    localStorage.removeItem('app_user');
    localStorage.removeItem('animem_tg_session');
    setShowAuthModal(true);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    sessionStorage.setItem('app_guest_mode', 'true');
    setShowAuthModal(false);
  }, []);

  const openAuthModal = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    // Only close if user or guest is active
    if (user || isGuest) {
      setShowAuthModal(false);
    }
  }, [user, isGuest]);

  // Handle URL query parameters for external OAuth redirect returns (Telegram, Google, Discord)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paramToken = urlParams.get('token') || urlParams.get('auth_token');
    const paramUser = urlParams.get('user');
    const authSession = urlParams.get('auth_session');
    const localSession = localStorage.getItem('animem_tg_session');

    // Case 1: Direct token in URL params
    if (paramToken) {
      let parsedUser: any = { id: Date.now(), name: "Animem User", email: "" };
      if (paramUser) {
        try {
          parsedUser = JSON.parse(decodeURIComponent(paramUser));
        } catch (e) {}
      }
      login(paramToken, parsedUser);
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Case 2: Telegram session polling from URL or saved session
    const targetSessionId = authSession || localSession;
    if (targetSessionId && !user) {
      let isMounted = true;
      let count = 0;

      const checkTelegramSession = async () => {
        try {
          const res = await fetch(`/api/auth/telegram/status/${targetSessionId}`);
          if (!res.ok) return false;
          const data = await res.json();
          if (!isMounted) return true;

          if (data.status === 'authorized' && data.token && data.user) {
            localStorage.removeItem('animem_tg_session');
            login(data.token, data.user);
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
          } else if (data.status === 'expired') {
            localStorage.removeItem('animem_tg_session');
            return true;
          }
        } catch (e) {}
        return false;
      };

      checkTelegramSession();
      const interval = setInterval(async () => {
        count++;
        const done = await checkTelegramSession();
        if (done || count >= 120) {
          clearInterval(interval);
        }
      }, 2500);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [login, user]);

  useEffect(() => {
    localStorage.setItem('anime_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('app_watch_history', JSON.stringify(history));
  }, [history]);

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
      isGuest,
      showAuthModal,
      openAuthModal,
      closeAuthModal,
      continueAsGuest,
      login,
      logout,
      favorites,
      history,
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
