import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { Moon, Sun, Laptop } from 'lucide-react';

/**
 * Settings page component
 */
export function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how ConnectiLearn looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                theme === 'light' ? 'bg-muted' : ''
              }`}
              onClick={() => setTheme('light')}
            >
              <div className="flex items-center gap-3">
                <Sun className="h-5 w-5" />
                <div>
                  <p className="font-medium">Light Mode</p>
                  <p className="text-sm text-muted-foreground">Bright and clear</p>
                </div>
              </div>
              <Switch checked={theme === 'light'} />
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                theme === 'dark' ? 'bg-muted' : ''
              }`}
              onClick={() => setTheme('dark')}
            >
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5" />
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Easy on the eyes</p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} />
            </div>

            <div
              className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                theme === 'system' ? 'bg-muted' : ''
              }`}
              onClick={() => setTheme('system')}
            >
              <div className="flex items-center gap-3">
                <Laptop className="h-5 w-5" />
                <div>
                  <p className="font-medium">System</p>
                  <p className="text-sm text-muted-foreground">Match your system preferences</p>
                </div>
              </div>
              <Switch checked={theme === 'system'} />
            </div>
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle>About ConnectiLearn</CardTitle>
            <CardDescription>
              Version 1.0.0
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              ConnectiLearn is an AI-powered learning companion that uses advanced
              Retrieval-Augmented Generation (RAG) technology to provide context-aware
              answers based on your uploaded materials.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
