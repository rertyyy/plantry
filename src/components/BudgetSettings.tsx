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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        description: "Failed to update budget: " + (error?.message ?? String(error)),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="apple-card p-4 sm:p-6 rounded-xl min-w-0 w-full">
        <div className="text-center text-muted-foreground">Loading budget settings...</div>
      </div>
    );
  }

  return (
    <div className="apple-card p-4 sm:p-6 rounded-xl min-w-0 w-full">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6 min-w-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-tertiary rounded-xl flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg sm:text-2xl font-semibold text-foreground truncate">
            Budget Settings
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            Set your weekly grocery budget goal
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 sm:p-4 bg-surface-secondary rounded-lg min-w-0">
          <div className="flex items-center space-x-3 min-w-0">
            <DollarSign className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="font-medium text-foreground truncate">Budget</span>
          </div>
          
          {isEditing ? (
            <div className="flex items-center space-x-2 min-w-0">
              <input
                type="number"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                className="apple-input w-20 sm:w-24 text-right max-w-full"
                min="0"
                // prevent input from forcing layout by allowing it to shrink
                style={{ minWidth: 0 }}
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
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-xl sm:text-2xl font-bold text-primary truncate">
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
          <p className="truncate">Your weekly budget helps track spending progress and set financial goals for grocery shopping.</p>
        </div>
      </div>
    </div>
  );
}
