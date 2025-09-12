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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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
                      <ProtectedRoute user={user}>
                        <DashboardPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/groceries" element={
                      <ProtectedRoute user={user}>
                        <HouseholdGroceriesPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute user={user}>
                        <AnalyticsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/ai-generation" element={
                      <ProtectedRoute user={user}>
                        <AIGenerationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="/insights" element={
                      <ProtectedRoute user={user}>
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