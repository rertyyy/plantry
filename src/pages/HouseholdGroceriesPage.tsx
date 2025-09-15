import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import GroceryDragDrop from "@/components/GroceryDragDrop";
import WeeklyExpensesChart from "@/components/WeeklyExpensesChart";
import { useProfile } from "@/contexts/ProfileContext";
import { ArrowLeft, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HouseholdGroceriesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { profiles } = useProfile();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Please log in to continue.</p>
          <Button onClick={() => navigate("/auth")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Household Header - hidden on mobile, visible from sm and up */}
                  <div className="hidden sm:block bg-surface/80 backdrop-blur-xl border-b border-border/50 py-6 px-6 mb-4">
                    <div className="max-w-7xl mx-auto flex flex-col space-y-4">
                      {/* Top row with buttons */}
                      <div className="flex items-center justify-between">
                        <Button
                          onClick={() => navigate("/profile-selector")}
                          variant="ghost"
                          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Back to Profiles</span>
                        </Button>
                  
                        <Button
                          onClick={() => navigate("/profile-selector")}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <UserIcon className="w-4 h-4" />
                          <span>Manage Profiles</span>
                        </Button>
                      </div>
                  
                      {/* Household profiles + title */}
                      <div className="flex items-center space-x-4">
                        {/* Show all household profiles */}
                        <div className="flex -space-x-2">
                          {profiles.slice(0, 4).map((profile, index) => (
                            <div
                              key={profile.id}
                              className="w-12 h-12 rounded-full border-2 border-background flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                              style={{
                                backgroundColor: profile.color,
                                zIndex: profiles.length - index
                              }}
                              title={profile.name}
                            >
                              {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                          ))}
                          {profiles.length > 4 && (
                            <div className="w-12 h-12 rounded-full border-2 border-background bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold shadow-sm">
                              +{profiles.length - 4}
                            </div>
                          )}
                        </div>
                  
                        <div>
                          <h1 className="text-2xl font-bold text-foreground">
                            Household Groceries
                          </h1>
                          <p className="text-muted-foreground">
                            Shared grocery list for all family members
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
      
      {/* Main Content */}
      <div>
        <GroceryDragDrop user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WeeklyExpensesChart user={user} />
        </div>
      </div>
    </div>
  );
}
