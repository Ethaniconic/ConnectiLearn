import { Link } from 'react-router-dom';
import { Moon, Sun, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';

/**
 * Navigation bar component with theme toggle
 */
export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">ConnectiLearn</span>
        </Link>

        <div className="flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          <Link to="/chat" className="text-sm font-medium hover:text-primary transition-colors">
            Chat
          </Link>
          <Link to="/notes" className="text-sm font-medium hover:text-primary transition-colors">
            Notes
          </Link>
          <Link to="/settings" className="text-sm font-medium hover:text-primary transition-colors">
            Settings
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
