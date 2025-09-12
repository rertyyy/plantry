import { useState, useEffect } from "react";
import { Settings, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/use-toast";

interface BudgetSettingsProps {
  user: User;
  onBudgetUpdate: (budget: number) => void;
}

export default function BudgetSettings({ user, onBudgetUpdate }: BudgetSettingsProps) {
  const [budget, setBudget] = useState(100);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserSettings();
  }, [user]);

  const fetchUserSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('weekly_budget')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setBudget(data.weekly_budget);
        onBudgetUpdate(data.weekly_budget);
      } else {
        // Create default settings if none exist
        await createDefaultSettings();
      }
    } catch (error: any) {
      console.error('Error fetching user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert([{ user_id: user.id, weekly_budget: 100 }])
        .select()
        .single();

      if (error) throw error;

      setBudget(data.weekly_budget);
      onBudgetUpdate(data.weekly_budget);
    } catch (error: any) {
      console.error('Error creating default settings:', error);
    }
  };

  const handleSaveBudget = async () => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert([{ 
          user_id: user.id, 
          weekly_budget: budget 
        }], {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setIsEditing(false);
      onBudgetUpdate(budget);
      
      toast({
        title: "Budget updated",
        description: `Weekly budget set to $${budget.toFixed(2)}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update budget: " + error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="apple-card p-6 rounded-xl">
        <div className="text-center text-muted-foreground">Loading budget settings...</div>
      </div>
    );
  }

  return (
    <div className="apple-card p-6 rounded-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-surface-tertiary rounded-xl flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-foreground">
            Budget Settings
          </h3>
          <p className="text-muted-foreground">
            Set your weekly grocery budget goal
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Weekly Budget</span>
          </div>
          
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                className="apple-input w-24 text-right"
                min="0"
              />
              <button
                onClick={handleSaveBudget}
                className="apple-button-primary px-3 py-1 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="apple-button-secondary px-3 py-1 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-primary">
                ${budget.toFixed(2)}
              </span>
              <button
                onClick={() => setIsEditing(true)}
                className="apple-button-secondary px-3 py-1 text-sm"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Your weekly budget helps track spending progress and set financial goals for grocery shopping.</p>
        </div>
      </div>
    </div>
  );
}