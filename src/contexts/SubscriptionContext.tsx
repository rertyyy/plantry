import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface SubscriptionContextType {
  isProUser: boolean;
  isAdmin: boolean;
  subscriptionTier: string | null;
  loading: boolean;
  hasAccess: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
  user: User | null;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children, user }) => {
  const [isProUser, setIsProUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) {
      setIsProUser(false);
      setIsAdmin(false);
      setSubscriptionTier(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Check PayPal subscription
      const { data: subscription } = await supabase
        .from('paypal_subscribers')
        .select('subscribed, subscription_tier')
        .eq('user_id', user.id)
        .single();

      // Check admin role
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      const hasProSubscription = subscription?.subscribed && 
        (subscription?.subscription_tier === 'Pro' || subscription?.subscription_tier === 'Yearly Pro');
      
      const hasAdminRole = !!userRole;

      setIsProUser(hasProSubscription);
      setIsAdmin(hasAdminRole);
      setSubscriptionTier(subscription?.subscription_tier || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsProUser(false);
      setIsAdmin(false);
      setSubscriptionTier(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  const hasAccess = isProUser || isAdmin;

  const value = {
    isProUser,
    isAdmin,
    subscriptionTier,
    loading,
    hasAccess,
    checkSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};