import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
  color: string;
  theme?: string;
  dark_mode?: boolean;
  fun_mode?: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileContextType {
  profiles: Profile[];
  selectedProfile: Profile | null;
  loading: boolean;
  authChecked: boolean; // new: true only after Supabase hydration
  selectProfile: (profile: Profile) => void;
  createProfile: (name: string, color: string) => Promise<void>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  fetchProfiles: () => Promise<void>;
  clearSelection: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

interface ProfileProviderProps {
  children: React.ReactNode;
  user: User | null;
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children, user }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false); // <-- new
  const { toast } = useToast();

  // Wait for Supabase to hydrate session; only then mark authChecked = true
  useEffect(() => {
    let mounted = true;
    // initial check
    const check = async () => {
      try {
        // supabase v2: auth.getSession() returns { data: { session } }
        await supabase.auth.getSession();
      } catch (e) {
        // ignore - we still want to mark checked
      } finally {
        if (mounted) setAuthChecked(true);
      }
    };

    check();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, _session) => {
      // when auth state changes (sign in/out), we consider the auth hydrated
      if (mounted) setAuthChecked(true);
    });

    return () => {
      mounted = false;
      // unsubscribe if available
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Load selected profile from localStorage once profiles are loaded
  useEffect(() => {
    if (user && profiles.length > 0) {
      const savedProfileId = localStorage.getItem(`selectedProfile_${user.id}`);
      if (savedProfileId) {
        const profile = profiles.find(p => p.id === savedProfileId);
        if (profile) {
          setSelectedProfile(profile);
        }
      }
    }
  }, [user, profiles]);

  const fetchProfiles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch profiles: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    localStorage.setItem(`selectedProfile_${user?.id}`, profile.id);
  };

  const clearSelection = () => {
    setSelectedProfile(null);
    if (user) {
      localStorage.removeItem(`selectedProfile_${user.id}`);
    }
  };

  const createProfile = async (name: string, color: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          user_id: user.id,
          name,
          color
        }])
        .select()
        .single();

      if (error) throw error;

      setProfiles([...profiles, data]);
      toast({
        title: "Profile created",
        description: `${name} profile has been created.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create profile: " + error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setProfiles(profiles.map(profile =>
        profile.id === id ? { ...profile, ...updates } : profile
      ));

      if (selectedProfile?.id === id) {
        setSelectedProfile({ ...selectedProfile, ...updates });
      }

      toast({
        title: "Profile updated",
        description: "Profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update profile: " + error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProfile = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProfiles(profiles.filter(profile => profile.id !== id));
      
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
        if (user) {
          localStorage.removeItem(`selectedProfile_${user.id}`);
        }
      }

      toast({
        title: "Profile deleted",
        description: "Profile has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete profile: " + error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfiles();
    } else {
      setProfiles([]);
      setSelectedProfile(null);
      setLoading(false);
    }
  }, [user]);

  const value: ProfileContextType = {
    profiles,
    selectedProfile,
    loading,
    authChecked, // <-- exposed
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    fetchProfiles,
    clearSelection
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
