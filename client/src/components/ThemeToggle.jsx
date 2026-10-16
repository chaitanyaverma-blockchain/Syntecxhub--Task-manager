import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '', id = 'theme-toggle-btn' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      id={id}
      type="button"
      className={`btn-icon theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '38px',
        height: '38px',
        borderRadius: 'var(--radius-md)',
        transition: 'all var(--transition-fast)',
      }}
    >
      {isDark ? (
        <Sun size={19} color="#fbbf24" style={{ animation: 'fadeIn 150ms ease-in' }} />
      ) : (
        <Moon size={19} color="#475569" style={{ animation: 'fadeIn 150ms ease-in' }} />
      )}
    </button>
  );
};

export default ThemeToggle;
