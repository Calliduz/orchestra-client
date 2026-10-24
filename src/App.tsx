import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.js';
import { SocketProvider } from './context/SocketContext.js';
import { SkipLink } from './components/layout/SkipLink.js';
import { ScrollProgress } from './components/layout/ScrollProgress.js';
import { Header } from './components/layout/Header.js';
import { Footer } from './components/layout/Footer.js';
import { BackToTop } from './components/layout/BackToTop.js';
import { FacultyDashboardPage } from './pages/FacultyDashboardPage.js';
import { StudentOtpPage } from './pages/StudentOtpPage.js';
import { TerminalMonitorPage } from './pages/TerminalMonitorPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

export const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  const renderPage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <FacultyDashboardPage />;
      case 'otp':
        return <StudentOtpPage />;
      case 'terminal':
        return <TerminalMonitorPage />;
      default:
        return <NotFoundPage onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-hud-bg text-hud-text selection:bg-sky-500/30 selection:text-white font-body antialiased">
      {/* Accessibility Skip Link */}
      <SkipLink />

      {/* Viewport Scroll Progress Bar */}
      <ScrollProgress />

      {/* Sticky Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main Content Area */}
      <main id="main-content" className="flex-grow focus:outline-none">
        {renderPage()}
      </main>

      {/* Floating Scroll Back to Top Button */}
      <BackToTop />

      {/* Clean Institutional Footer */}
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </ThemeProvider>
  );
};

export default App;
