import { useState, useEffect } from "react";
import { useProfile } from "@/contexts/ProfileContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Palette, Sparkles, Moon, Sun } from "lucide-react";

export default function PreferencesPage() {
  const { selectedProfile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Local state for preferences
  const [theme, setTheme] = useState(selectedProfile?.theme || 'classic');
  const [darkMode, setDarkMode] = useState(selectedProfile?.dark_mode || false);
  const [funMode, setFunMode] = useState(selectedProfile?.fun_mode || false);

  // Sync with selected profile changes
  useEffect(() => {
    if (selectedProfile) {
      setTheme(selectedProfile.theme || 'classic');
      setDarkMode(selectedProfile.dark_mode || false);
      setFunMode(selectedProfile.fun_mode || false);
    }
  }, [selectedProfile]);

  // Apply theme changes to document
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      // Remove existing theme classes
      root.classList.remove('theme-classic', 'theme-sage', 'theme-purple', 'theme-sunset', 'theme-blossom', 'dark');
      
      // Apply dark mode if enabled
      if (darkMode) {
        root.classList.add('dark');
      }
      
      // Apply selected theme
      root.classList.add(`theme-${theme}`);
    };

    applyTheme();
  }, [theme, darkMode]);

  const handleSavePreferences = async () => {
    if (!selectedProfile) return;

    setIsLoading(true);
    try {
      await updateProfile(selectedProfile.id, {
        theme,
        dark_mode: darkMode,
        fun_mode: funMode
      });
      
      toast({
        title: "Preferences saved!",
        description: "Your theme preferences have been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const themes = [
    {
      id: 'classic',
      name: 'Classic',
      description: 'Clean monochrome design',
      preview: 'bg-surface border border-border'
    },
    {
      id: 'sage',
      name: 'Sage Garden',
      description: 'Calming sage green theme',
      preview: 'bg-green-50 border border-green-200'
    },
    {
      id: 'purple',
      name: 'Purple Dreams',
      description: 'Vibrant purple theme',
      preview: 'bg-purple-50 border border-purple-200'
    },
    {
      id: 'sunset',
      name: 'Sunset Vibes',
      description: 'Warm yellow with sunset gradient',
      preview: 'bg-yellow-50 border border-orange-200'
    },
    {
      id: 'blossom',
      name: 'Cherry Blossom',
      description: 'Soft pink with purple accents',
      preview: 'bg-pink-50 border border-pink-200'
    }
  ];

  if (!selectedProfile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Please select a profile to access preferences.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Preferences</h1>
        <p className="text-muted-foreground">Customize your experience for {selectedProfile.name}</p>
      </div>

      <div className="space-y-6">
        {/* Avatar Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: selectedProfile.color }}
              >
                {selectedProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              Avatar Preferences
            </CardTitle>
            <CardDescription>
              Customize your profile avatar and display settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="fun-mode" className="text-base font-medium">Fun Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Add confetti celebrations when you complete tasks!
                  </p>
                </div>
                <Switch
                  id="fun-mode"
                  checked={funMode}
                  onCheckedChange={setFunMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Theme Preferences
            </CardTitle>
            <CardDescription>
              Choose your preferred color scheme and appearance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dark-mode" className="text-base font-medium flex items-center gap-2">
                    {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark appearance
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>

              {/* Theme Selection */}
              <div>
                <Label className="text-base font-medium mb-3 block">Color Theme</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {themes.map((themeOption) => (
                    <div
                      key={themeOption.id}
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                        theme === themeOption.id 
                          ? 'border-primary shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setTheme(themeOption.id)}
                    >
                      <div className={`w-full h-12 rounded-md mb-3 ${themeOption.preview}`}></div>
                      <h3 className="font-medium text-foreground">{themeOption.name}</h3>
                      <p className="text-sm text-muted-foreground">{themeOption.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSavePreferences}
            disabled={isLoading}
            className="px-8"
          >
            {isLoading ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}