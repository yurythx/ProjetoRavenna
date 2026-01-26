import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button onClick={() => setTheme(next)}>
      {next}
    </button>
  );
}
