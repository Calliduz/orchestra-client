import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext.js';

// Component helper to expose ThemeContext values for testing
const ThemeConsumer: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button type="button" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

// Mirror the exact algorithm embedded in orchestra-client/index.html (lines 7-23)
function executeIndexHtmlThemeBootstrap() {
  try {
    const stored = localStorage.getItem('orchestra-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  } catch {
    document.documentElement.classList.add('dark');
  }
}

describe('Theme Persistence and Initialization (WCAG / UX Compliance)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    vi.restoreAllMocks();
  });

  describe('index.html inline script bootstrap logic', () => {
    it('sets light theme on clean browser profile when user OS prefers light mode', () => {
      // Simulate clean profile: no localStorage entry
      expect(localStorage.getItem('orchestra-theme')).toBeNull();

      // Mock matchMedia: prefers-color-scheme: dark is false
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('light'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      executeIndexHtmlThemeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('sets dark theme on clean browser profile when user OS prefers dark mode', () => {
      expect(localStorage.getItem('orchestra-theme')).toBeNull();

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      executeIndexHtmlThemeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('respects stored dark theme even if user OS prefers light mode', () => {
      localStorage.setItem('orchestra-theme', 'dark');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('light'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      executeIndexHtmlThemeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('respects stored light theme even if user OS prefers dark mode', () => {
      localStorage.setItem('orchestra-theme', 'light');

      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      executeIndexHtmlThemeBootstrap();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
  });

  describe('ThemeProvider runtime context lifecycle', () => {
    it('initializes to light theme when clean profile prefers light mode', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('light'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(localStorage.getItem('orchestra-theme')).toBe('light');
    });

    it('toggles theme between light and dark and updates localStorage', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Toggle to light
      const toggleBtn = screen.getByRole('button', { name: /Toggle Theme/i });
      act(() => {
        fireEvent.click(toggleBtn);
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(localStorage.getItem('orchestra-theme')).toBe('light');

      // Toggle back to dark
      act(() => {
        fireEvent.click(toggleBtn);
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
      expect(localStorage.getItem('orchestra-theme')).toBe('dark');
    });
  });
});
