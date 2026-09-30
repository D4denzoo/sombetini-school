'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && theme === 'dark';
  return (
    <Button variant="ghost" size="icon" className={className} onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
