/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { AudioProvider } from './context/AudioContext';

import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { SongbookScreen } from './components/SongbookScreen';
import { SongDetailScreen } from './components/SongDetailScreen';
import { AudioLibraryScreen } from './components/AudioLibraryScreen';
import { SupportScreen } from './components/SupportScreen';
import { MoreScreen } from './components/MoreScreen';
import { AboutScreen } from './components/AboutScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { GlobalAudioPlayer } from './components/GlobalAudioPlayer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthModal } from './components/AuthModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AppStorePrepModal } from './components/AppStorePrepModal';
import { OfflineIndicator } from './components/OfflineIndicator';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);

  // Password reset modal states
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Check URL on initial mount and popstate for shared song link or password reset token
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const songParam = params.get('song');
      if (songParam) {
        setSelectedSongId(songParam);
      }

      const tokenParam = params.get('reset_token') || params.get('token');
      const emailParam = params.get('email');
      if (tokenParam) {
        setResetToken(tokenParam);
        if (emailParam) setResetEmail(emailParam);
        setIsResetModalOpen(true);
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const handleSelectSong = (songId: string) => {
    setSelectedSongId(songId);
    const url = new URL(window.location.href);
    url.searchParams.set('song', songId);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackFromSong = () => {
    setSelectedSongId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('song');
    window.history.pushState({}, '', url.toString());
  };

  const handleNavigateToTab = (tab: string) => {
    setSelectedSongId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('song');
    window.history.pushState({}, '', url.toString());
    if (tab !== 'songs') {
      setSelectedCategory('all');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedSongId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('song');
    window.history.pushState({}, '', url.toString());
    setSelectedCategory(categoryId);
    setActiveTab('songs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Mobile Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigateToTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-4">
        {selectedSongId ? (
          <SongDetailScreen
            songId={selectedSongId}
            onBack={handleBackFromSong}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                onSelectSong={handleSelectSong}
                onNavigateToTab={handleNavigateToTab}
                onSelectCategory={handleSelectCategory}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'songs' && (
              <SongbookScreen
                onSelectSong={handleSelectSong}
                initialCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            )}

            {activeTab === 'audio' && (
              <AudioLibraryScreen
                onOpenSongLyrics={handleSelectSong}
              />
            )}

            {activeTab === 'support' && (
              <SupportScreen />
            )}

            {activeTab === 'more' && (
              <MoreScreen
                onNavigateToTab={handleNavigateToTab}
                onOpenStoreModal={() => setIsStoreModalOpen(true)}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'about' && (
              <AboutScreen />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                onSelectSong={handleSelectSong}
                onNavigateToTab={handleNavigateToTab}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'admin' && (
              <AdminDashboard
                onSelectSong={handleSelectSong}
                onNavigateHome={() => handleNavigateToTab('home')}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent Audio Player Dock & Modal */}
      <GlobalAudioPlayer onOpenSong={handleSelectSong} />

      {/* Persistent Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleNavigateToTab}
      />

      {/* Offline Status & Downloaded Songs Indicator */}
      <OfflineIndicator
        onOpenOfflineSongs={() => {
          setSelectedSongId(null);
          setSelectedCategory('all');
          setActiveTab('songs');
        }}
      />

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSong={handleSelectSong}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenResetWithToken={(token, email) => {
          setResetToken(token);
          setResetEmail(email);
          setIsResetModalOpen(true);
        }}
      />

      <ResetPasswordModal
        isOpen={isResetModalOpen}
        token={resetToken || ''}
        email={resetEmail}
        onClose={() => {
          setIsResetModalOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('reset_token');
          url.searchParams.delete('token');
          url.searchParams.delete('email');
          window.history.pushState({}, '', url.toString());
        }}
        onSuccess={() => {
          setIsResetModalOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.delete('reset_token');
          url.searchParams.delete('token');
          url.searchParams.delete('email');
          window.history.pushState({}, '', url.toString());
          setIsAuthOpen(true);
        }}
      />

      <AppStorePrepModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrandingProvider>
        <AudioProvider>
          <AppContent />
        </AudioProvider>
      </BrandingProvider>
    </AuthProvider>
  );
}
