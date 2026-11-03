// Три кнопки выбора темы. aria-pressed подсвечивает активную (правило есть в CSS).
import type { ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';
import { MonitorIcon, MoonIcon, SunIcon } from './Icons';

const OPTIONS: { value: Theme; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'Как в системе', icon: <MonitorIcon /> },
  { value: 'light', label: 'Светлая тема', icon: <SunIcon /> },
  { value: 'dark', label: 'Тёмная тема', icon: <MoonIcon /> },
];

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switch" role="group" aria-label="Тема оформления">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.label}
          aria-label={option.label}
          aria-pressed={theme === option.value}
          onClick={() => setTheme(option.value)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
