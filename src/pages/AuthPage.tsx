import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Helper to navigate back to the intended route if present
  const redirectToFrom = () => {
    const from = (location.state as any)?.from?.pathname ?? (location.state as any)?.from;
    if (from) {
      navigate(from, { replace: true });
    } else {
      // optional: go home if no "from", but keep it conservative by staying on auth page.
      navigate("/", { replace: true });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const res = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (res.error) throw res.error;

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });

        // If the sign-in returned a session right away, redirect to the original route.
        if (res.data?.session?.user) {
          redirectToFrom();
        }
        // Otherwise, App's central auth subscription will update state; no further action here.
      } else {
        const res = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (res.error) throw res.error;

        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });

        // If signup created a session (rare when email confirmation disabled), redirect.
        if (res.data?.session?.user) {
          redirectToFrom();
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      // OAuth will redirect externally — nothing more to do here.
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message ?? String(error),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Form Card with Header Inside */}
        <div className="bg-surface border border-border rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-surface to-surface-secondary px-8 py-10 text-center border-b border-border">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-lg text-muted-foreground">
              {isLogin ? "Sign in to your account" : "Start tracking your groceries"}
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-6">
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl px-4 py-4 flex items-center justify-center space-x-3 transition-all duration-200 transform hover:scale-[1.02] shadow-sm hover:shadow-md dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">
                  {isLogin ? "Sign in with Google" : "Sign up with Google"}
                </span>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-surface text-muted-foreground">or continue with email</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-secondary border border-border rounded-xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-muted text-primary-foreground text-lg py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
              </Button>
            </form>

            {/* Toggle between login/signup */}
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-base text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
