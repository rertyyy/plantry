import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: User | null;
  authChecked: boolean; // <-- minimal addition
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, authChecked }) => {
  const { hasAccess, loading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

 useEffect(() => {
  if (!authChecked || loading) return; // ✅ still wait for both

  if (!user) {
    navigate("/auth", { replace: true, state: { from: location } });
    return;
  }

  if (!hasAccess) {
    navigate("/pricing", { replace: true });
    return;
  }
}, [authChecked, hasAccess, loading, user, navigate, location]);
  
  // Show loading state while checking subscription or waiting for auth rehydration
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  // If no user or no access after checks, don't render children (redirect has already run)
  if (!user) return null;
  if (!hasAccess) return null;

  // User has access, render the protected content
  return <>{children}</>;
};
