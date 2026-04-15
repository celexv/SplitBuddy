'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Prevent hydration mismatch by not rendering the toggle until mounted
  if (!mounted) {
    return <div className="theme-toggle-placeholder" style={{ width: '40px', height: '22px' }}></div>;
  }

  return (
    <div className="theme-toggle" onClick={toggleTheme}>
      <input
        type="checkbox"
        className="theme-checkbox"
        id="theme-checkbox"
        checked={theme === 'dark'}
        onChange={toggleTheme}
      />
      <label htmlFor="theme-checkbox" className="theme-label" onClick={(e) => e.preventDefault()}>
        <span className="theme-slider">
          <span className="theme-icon sun">☀️</span>
          <span className="theme-icon moon">🌙</span>
          <span className="theme-ball"></span>
        </span>
      </label>
    </div>
  );
}
