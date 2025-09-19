import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, Save, Settings } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export default function ProfileSelectorPage() {
  const navigate = useNavigate();
  const { profiles, selectedProfile, selectProfile, createProfile, updateProfile, deleteProfile, loading } = useProfile();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileColor, setNewProfileColor] = useState(AVATAR_COLORS[0]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleProfileSelect = (profile: any) => {
    selectProfile(profile);
    navigate('/groceries');
  };

  const handleCreateProfile = async () => {
    if (newProfileName.trim()) {
      await createProfile(newProfileName.trim(), newProfileColor);
      setShowCreateModal(false);
      setNewProfileName('');
      setNewProfileColor(AVATAR_COLORS[0]);
    }
  };

  const handleEditProfile = (profile: any) => {
    setEditingProfile(profile.id);
    setEditName(profile.name);
    setEditColor(profile.color);
  };

  const handleSaveEdit = async () => {
    if (editingProfile && editName.trim()) {
      await updateProfile(editingProfile, {
        name: editName.trim(),
        color: editColor
      });
      setEditingProfile(null);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (profiles.length > 1) {
      await deleteProfile(profileId);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Header */}
      <div className="pt-8 pb-4">
        <div className="max-w-[1060px] mx-auto px-[55px]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Choose Your Profile
              </h1>
              <p className="text-muted-foreground">
                All profiles share the same household groceries and pantry
              </p>
            </div>
              <Button
                variant="outline"
                onClick={() => navigate('/settings')}
                className="hidden sm:flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Button>
            </div>
        </div>
      </div>

     {/* Profiles Grid */}
<div className="max-w-5xl mx-auto px-[25px] py-8">
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
    {profiles.map((profile) => (
      <div key={profile.id} className="group relative flex flex-col items-center w-full">
        {editingProfile === profile.id ? (
          <div className="bg-surface border border-white sm:border-border rounded-3xl p-6 aspect-square flex flex-col justify-center items-center relative w-full">
            <div 
              className="w-28 h-28 rounded-3xl flex items-center justify-center text-white text-3xl font-bold"
              style={{ backgroundColor: editColor }}
            >
              {getInitials(editName || profile.name)}
            </div>
            
            <div className="space-y-3 mt-6 w-full px-4">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Profile name"
                className="text-center"
              />
              
              <div className="flex flex-wrap gap-2 justify-center">
                {AVATAR_COLORS.slice(0, 6).map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      editColor === color ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleSaveEdit}
                  size="sm"
                  className="flex-1"
                >
                  <Save className="w-3 h-3" />
                </Button>
                <Button
                  onClick={() => setEditingProfile(null)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Square Profile Card */}
            <div 
              onClick={() => handleProfileSelect(profile)}
              className="bg-surface border border-white sm:border-border rounded-3xl p-6 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg hover:border-primary/50 aspect-square flex flex-col justify-center items-center text-center relative w-full"
            >
              <div 
                className="w-28 h-28 rounded-3xl flex items-center justify-center text-white text-4xl font-bold mb-4"
                style={{ backgroundColor: profile.color }}
              >
                {getInitials(profile.name)}
              </div>
              
              <h3 className="font-semibold text-foreground text-xl">
                {profile.name}
              </h3>

              {/* Currently Selected badge */}
              {selectedProfile?.id === profile.id && (
                <div className="absolute top-1 sm:top-2 right-2 bg-apple-blue text-apple-blue-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                  Selected
                </div>
              )}
            </div>

            {/* Edit/Delete buttons BELOW the card (shown on hover) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto flex space-x-2 justify-center mt-2 w-full">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditProfile(profile);
                }}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 text-foreground"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              {profiles.length > 1 && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProfile(profile.id);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    ))}
    
    {/* Add Profile Button */}
    {profiles.length < 5 && (
      <div 
        onClick={() => setShowCreateModal(true)}
        className="bg-surface border-2 border-dashed border-white sm:border-border rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 hover:scale-105 hover:border-primary/50 flex flex-col items-center justify-center aspect-square relative w-full"
      >
        <div className="w-28 h-28 rounded-3xl bg-surface-secondary border border-border flex items-center justify-center mb-4">
          <Plus className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-muted-foreground text-xl">
          Add Profile
        </h3>
      </div>
    )}
  </div>
</div>


      {/* Create Profile Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <div 
                className="w-24 h-24 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-semibold"
                style={{ backgroundColor: newProfileColor }}
              >
                {getInitials(newProfileName || 'New')}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Name
                </label>
                <Input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Enter profile name"
                  maxLength={20}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Choose Color
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewProfileColor(color)}
                      className={`w-12 h-12 rounded-xl border-2 transition-all ${
                        newProfileColor === color 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProfile}
                disabled={!newProfileName.trim()}
                className="flex-1"
              >
                Create Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
