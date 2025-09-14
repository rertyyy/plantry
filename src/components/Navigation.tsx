import { NavLink, useNavigate } from "react-router-dom";
import { Home, Package, Zap, BarChart3, LogOut, MessageSquare, ChevronDown, Settings, Palette, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { CircuitBoard, ChartPie } from "lucide-react";


export const Navigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string>("");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // <-- minimal addition for hamburger
  const { selectedProfile, clearSelection } = useProfile();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Set username from user metadata
        if (session?.user) {
          setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || "User");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Set username from user metadata
      if (session?.user) {
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || "User");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      clearSelection();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
      navigate("/");
      setShowProfileDropdown(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSwitchProfiles = () => {
    navigate("/profile-selector");
    setShowProfileDropdown(false);
  };

  const handleSettings = () => {
    navigate("/settings");
    setShowProfileDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showProfileDropdown && !(event.target as Element)?.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
      // also close mobile menu when tapping outside of it
      if (isMenuOpen && !(event.target as Element)?.closest('.mobile-menu') && !(event.target as Element)?.closest('.mobile-menu-toggle')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileDropdown, isMenuOpen]);

  const navItems = user ? [
    { to: "/", icon: Home, label: "Home" },
    { to: "/profile-selector", icon: Package, label: "Groceries" },
    { to: "/ai-generation", icon: Zap, label: "AI Generation" },
    { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  ] : [
    { to: "/", icon: Home, label: "Home" },
    { to: "/pricing", icon: Package, label: "Pricing" },
    { to: "/contact", icon: MessageSquare, label: "Contact" },
  ];

  return (
    <nav className="bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-2">
            <img
              src="/favicon.ico"
              alt="favicon"
              className="w-6 h-6"
            />
            <h1 className="text-lg font-semibold text-foreground">Plantry</h1>
          </div>

          {/* Desktop: keep as-is but hide on small screens */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors duration-200 ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-grey-300"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </NavLink>
              ))}
            </div>

            {user ? (
              <div className="flex items-center space-x-3 ml-8 relative profile-dropdown">
                <span className="text-sm text-muted-foreground">
                  Welcome, {username}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className="flex items-center space-x-2"
                >
                  {selectedProfile ? (
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: selectedProfile.color }}
                    >
                      {selectedProfile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  ) : (
                    <Package className="w-4 h-4" />
                  )}
                  <span>Profile</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </Button>
                
                {showProfileDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={handleSwitchProfiles}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors flex items-center space-x-2"
                      >
                        <Package className="w-4 h-4" />
                        <span>Switch Profiles</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate("/preferences");
                          setShowProfileDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors flex items-center space-x-2"
                      >
                        <Palette className="w-4 h-4" />
                        <span>Preferences</span>
                      </button>
                      <button
                        onClick={handleSettings}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors flex items-center space-x-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-secondary transition-colors flex items-center space-x-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/auth"
                className="apple-button-primary px-4 py-2 rounded-xl text-sm font-medium ml-8"
              >
                Sign In
              </NavLink>
            )}
          </div>

          {/* Minimal addition: mobile hamburger (visible only on small screens) */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 mobile-menu-toggle"
              aria-label="Toggle menu"
              type="button"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Minimal addition: mobile collapsible menu (placed outside top bar so desktop remains untouched) */}
      {/* Mobile collapsible menu (replace your existing isMenuOpen block with this) */}
{isMenuOpen && (
  <div className="md:hidden bg-surface border-t border-border px-4 pb-4 space-y-2 mobile-menu">
    {/* primary nav items (existing) */}
    {navItems.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setIsMenuOpen(false)}
        className={({ isActive }) =>
          `flex items-center py-2 text-sm font-medium ${
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`
        }
      >
        <item.icon className="w-4 h-4 mr-2" />
        {item.label}
      </NavLink>
    ))}

    {/* for logged-in users: add sidebar items (dashboard, analytics, insights, settings, preferences) */}
    {user && (
      <>
        <hr className="border-border my-1" />
        <div className="pt-1 space-y-1">
          {[
            { to: "/analytics", icon: CircuitBoard, label: "Analytics" },
            { to: "/insights", icon: ChartPie, label: "Insights" },
            { to: "/settings", icon: Settings, label: "Settings" },
            { to: "/preferences", icon: Palette, label: "Preferences" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center py-2 text-sm font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </>
    )}

    {/* auth / logout (existing, unchanged behavior) */}
    {user ? (
      <button
        onClick={() => { setIsMenuOpen(false); handleSignOut(); }}
        className="w-full text-left py-2 text-sm text-foreground hover:text-primary"
      >
        Logout
      </button>
    ) : (
      <NavLink
        to="/auth"
        onClick={() => setIsMenuOpen(false)}
        className="block py-2 text-sm font-medium text-primary"
      >
        Sign In
      </NavLink>
    )}
  </div>
)}
    </nav>
  );
};
