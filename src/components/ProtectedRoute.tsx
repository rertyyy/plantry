import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { User } from '@supabase/supabase-js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  user: User | null;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user }) => {
  const { hasAccess, loading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // If no user is logged in, redirect to auth
    if (!user) {
      navigate('/auth');
      return;
    }

    // If user doesn't have access (not pro or admin), redirect to pricing
    if (!hasAccess) {
      navigate('/pricing');
      return;
    }
  }, [hasAccess, loading, user, navigate]);

  // Show loading state while checking subscription
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  // If no user, don't render anything (will redirect to auth)
  if (!user) {
    return null;
  }

  // If no access, don't render anything (will redirect to pricing)
  if (!hasAccess) {
    return null;
  }

  // User has access, render the protected content
  return <>{children}</>;
};
