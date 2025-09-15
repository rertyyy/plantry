import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: User | null;
  authChecked: boolean; // added
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, authChecked }) => {
  const { hasAccess, loading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth rehydration AND subscription loading to finish before redirecting
    if (!authChecked || loading) return;

    // If no user after authChecked, redirect to auth (preserve attempted location)
    if (!user) {
      navigate('/auth', { replace: true, state: { from: location } });
      return;
    }

    // If user doesn't have access (not pro or admin), redirect to pricing
    if (!hasAccess) {
      navigate('/pricing', { replace: true });
      return;
    }
  }, [authChecked, hasAccess, loading, user, navigate, location]);

  // Show loading state while waiting for auth or subscription check
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  // If checks finished and user/access invalid, don't render children (redirect already ran)
  if (!user) return null;
  if (!hasAccess) return null;

  return <>{children}</>;
};
