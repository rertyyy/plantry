// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "./components/Navigation";
import { Footer } from "./components/Footer";
import Homepage from "./pages/Homepage";
import HouseholdGroceriesPage from "./pages/HouseholdGroceriesPage";
import ProfileSelectorPage from "./pages/ProfileSelectorPage";
import AIGenerationPage from "./pages/AIGenerationPage";
import DashboardPage from "./pages/DashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import InsightsPage from "./pages/InsightsPage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import PreferencesPage from "./pages/PreferencesPage";
import NotFound from "./pages/NotFound";
import { ProfileProvider } from "./contexts/ProfileContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Get initial session and mark authChecked once resolved
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthChecked(true);
      })
      .catch(() => {
        // Even on error, mark checked so ProtectedRoute won't wait forever
        setAuthChecked(true);
      });

    // Listen for auth changes and keep state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthChecked(true); // any auth event confirms the auth system is active
    });

    return () => {
      try {
        subscription?.unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SubscriptionProvider user={user}>
            <ProfileProvider user={user}>
              <div className="flex flex-col min-h-screen">
                <Navigation />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Homepage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/preferences" element={<PreferencesPage />} />
                    <Route path="/profile-selector" element={<ProfileSelectorPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute user={user} authChecked={authChecked}>
                        <DashboardPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/groceries" element={
                      <ProtectedRoute user={user} authChecked={authChecked}>
                        <HouseholdGroceriesPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute user={user} authChecked={authChecked}>
                        <AnalyticsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai-generation" element={
                      <ProtectedRoute user={user} authChecked={authChecked}>
                        <AIGenerationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/insights" element={
                      <ProtectedRoute user={user} authChecked={authChecked}>
                        <InsightsPage />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </ProfileProvider>
          </SubscriptionProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
