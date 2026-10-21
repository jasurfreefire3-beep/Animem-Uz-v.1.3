import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceFrame } from './components/DeviceFrame';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { AuthScreen } from './pages/AuthScreen';

// Pages
import { HomeScreen } from './pages/HomeScreen';
import { ExploreScreen } from './pages/ExploreScreen';
import { WatchScreen } from './pages/WatchScreen';
import { ReelsScreen } from './pages/ReelsScreen';
import { FavoritesScreen } from './pages/FavoritesScreen';
import { MikaScreen } from './pages/MikaScreen';
import { ProfileScreen } from './pages/ProfileScreen';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isWatchScreen = location.pathname.startsWith('/watch');
  const { user, isGuest, showAuthModal, closeAuthModal } = useAuth();

  // If user is neither logged in nor in guest mode, show the AuthScreen first!
  const requireAuth = (!user && !isGuest) || showAuthModal;

  return (
    <DeviceFrame>
      <ScrollToTop />
      {!isWatchScreen && <TopHeader />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/explore" element={<ExploreScreen />} />
          <Route path="/watch/:id" element={<WatchScreen />} />
          <Route path="/reels" element={<ReelsScreen />} />
          <Route path="/favorites" element={<FavoritesScreen />} />
          <Route path="/mika" element={<MikaScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
        </Routes>
      </main>
      <BottomNav />

      {/* Auth Screen Gate */}
      {requireAuth && (
        <AuthScreen onClose={closeAuthModal} />
      )}
    </DeviceFrame>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
