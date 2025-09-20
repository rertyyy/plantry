// src/pages/WeeklyPlannerPage.tsx
import { useEffect, useState, useCallback } from "react";
import { Calendar, Save, FolderOpen, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner", "Dessert"];

type MealPlan = Record<string, Record<string, string>>;
type SavedMealPlan = {
  id: string;
  name: string;
  meal_plan: MealPlan;
  created_at: string;
  updated_at: string;
};

export default function WeeklyPlannerPage() {
  const { toast } = useToast();
  const [pantryItemsUI, setPantryItemsUI] = useState<Array<{ id: string; name: string; expiration_date: string }>>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => {
    const empty: MealPlan = {};
    days.forEach((d) => {
      empty[d] = {};
      meals.forEach((m) => (empty[d][m] = ""));
    });
    return empty;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // Load pantry preview and saved plans
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      // Fetch pantry items
      const { data: pantryData, error: pantryError } = await supabase
        .from("groceries")
        .select("id, name, expiration_date")
        .eq("type", "pantry")
        .eq("archived", false)
        .order("name", { ascending: true });
      
      if (!pantryError && pantryData) setPantryItemsUI(pantryData);
      
      // Fetch saved meal plans
      const { data: plansData, error: plansError } = await (supabase as any)
        .from("pastmealplans")
        .select("*")
        .order("updated_at", { ascending: false });
      
      if (!plansError && plansData) setSavedPlans(plansData as SavedMealPlan[]);
    };
    fetchData();
  }, []);

  // Auto-save debounced function
  const autoSave = useCallback(async (updatedPlan: MealPlan) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !currentPlanId) return;
    
    try {
      await (supabase as any)
        .from("pastmealplans")
        .update({ 
          meal_plan: updatedPlan,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentPlanId);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [currentPlanId]);

  // Controlled input handler with auto-save
  const handleChange = (day: string, meal: string, value: string) => {
    setMealPlan((prev) => {
      const updated = {
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: value
        }
      };
      
      // Auto-save after 1 second delay
      setTimeout(() => autoSave(updated), 1000);
      
      return updated;
    });
  };

  // Generate AI Plan: call Supabase Edge Function generate-mealplan
  const handleGenerateAIPlan = async () => {
    setIsLoading(true);
    try {
      // Pass pantry items (function also supports DB extraction if not provided)
      const body = {
        userMessage: "Please create a weekly meal plan using pantry items.",
        pantryItems: pantryItemsUI.map(p => ({ name: p.name, expiration_date: p.expiration_date }))
      };

      const { data, error } = await supabase.functions.invoke("generate-mealplan", { body });

      if (error) throw error;
      if (!data) throw new Error("No data returned from generate-mealplan");

      const { mealPlan: remotePlan, shoppingNeeded, aiMessage } = data;

      if (!remotePlan) throw new Error("Invalid meal plan returned");

      // Merge into local state (overwrite with remote values when provided and not SHOPPING NEEDED)
      setMealPlan((prev) => {
        const next: MealPlan = {};
        days.forEach((d) => {
          next[d] = {};
          meals.forEach((m) => {
            const remoteVal = remotePlan?.[d]?.[m];
            if (remoteVal && remoteVal !== "SHOPPING NEEDED") {
              next[d][m] = remoteVal;
            } else {
              // keep existing or empty
              next[d][m] = prev[d]?.[m] ?? "";
            }
          });
        });
        return next;
      });

      toast({
        title: shoppingNeeded ? "Partial Fill — Shopping Needed" : "Weekly Plan Filled",
        description: aiMessage || (shoppingNeeded ? "Some slots require shopping." : "Your week is filled using pantry items.")
      });

    } catch (err: any) {
      console.error("generate-mealplan error:", err);
      toast({
        title: "Failed to generate plan",
        description: err?.message || "Something went wrong",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save meal plan
  const saveMealPlan = async () => {
    if (!saveName.trim()) {
      toast({ title: "Error", description: "Please enter a name for your meal plan", variant: "destructive" });
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: "Error", description: "Please log in to save meal plans", variant: "destructive" });
      return;
    }
    
    try {
      const { data, error } = await (supabase as any)
        .from("pastmealplans")
        .insert({
          name: saveName,
          meal_plan: mealPlan,
          user_id: session.user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setCurrentPlanId(data.id);
      setSavedPlans(prev => [data as SavedMealPlan, ...prev]);
      setSaveName("");
      setSaveDialogOpen(false);
      toast({ title: "Saved", description: `Meal plan "${saveName}" saved successfully` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Load meal plan
  const loadMealPlan = (plan: SavedMealPlan) => {
    setMealPlan(plan.meal_plan);
    setCurrentPlanId(plan.id);
    setLoadDialogOpen(false);
    toast({ title: "Loaded", description: `Meal plan "${plan.name}" loaded` });
  };

  // Delete meal plan
  const deleteMealPlan = async (planId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("pastmealplans")
        .delete()
        .eq("id", planId);
      
      if (error) throw error;
      
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (currentPlanId === planId) setCurrentPlanId(null);
      toast({ title: "Deleted", description: "Meal plan deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Button: Generate shopping list placeholder
  const handleShoppingList = () => {
    toast({ title: "Shopping list", description: "This feature is not implemented yet." });
  };

  // Clear plan helper
  const clearPlan = () => {
    const empty: MealPlan = {};
    days.forEach((d) => {
      empty[d] = {};
      meals.forEach((m) => (empty[d][m] = ""));
    });
    setMealPlan(empty);
    setCurrentPlanId(null);
    toast({ title: "Cleared", description: "Weekly plan cleared." });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Weekly Meal Planner</h1>
        </div>
        <div className="flex items-center justify-between gap-4">
          <p className="text-muted-foreground">Plan your meals for the week ahead</p>
          <div className="text-sm text-muted-foreground">
            Pantry items: <span className="font-medium text-foreground">{pantryItemsUI.length}</span>
          </div>
        </div>
      </div>

      {/* Top Quick Action Buttons */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Meal Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Enter plan name..."
                onKeyDown={(e) => e.key === "Enter" && saveMealPlan()}
              />
              <div className="flex gap-2">
                <Button onClick={saveMealPlan} disabled={!saveName.trim()}>
                  Save
                </Button>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Load Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Load Meal Plan</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {savedPlans.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No saved plans yet</p>
              ) : (
                savedPlans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex-1">
                      <h4 className="font-medium">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(plan.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => loadMealPlan(plan)}>
                        Load
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteMealPlan(plan.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={clearPlan}>
          Clear
        </Button>
        
        <Button variant="outline" onClick={handleShoppingList}>
          Shopping List
        </Button>
      </div>

      {/* Weekly Planner Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left p-4 font-semibold text-foreground border-r border-border w-32">
                    Meal
                  </th>
                  {days.map((day) => (
                    <th key={day} className="text-center p-4 font-semibold text-foreground border-r border-border last:border-r-0">
                      <div className="text-sm">{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meals.map((meal, mealIndex) => (
                  <tr key={meal} className={`border-b border-border last:border-b-0 ${mealIndex % 2 === 0 ? 'bg-surface/30' : 'bg-background'}`}>
                    <td className="p-4 font-medium text-foreground border-r border-border bg-surface/50">
                      {meal}
                    </td>
                    {days.map((day) => (
                      <td key={`${meal}-${day}`} className="p-4 border-r border-border last:border-r-0">
                        <div className="min-h-[80px] w-full">
                          <textarea
                            value={mealPlan[day]?.[meal] ?? ""}
                            onChange={(e) => handleChange(day, meal, e.target.value)}
                            className="w-full h-full min-h-[80px] resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md p-2"
                            placeholder="Add meal..."
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Status indicator */}
      {currentPlanId && (
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            ✓ Changes are automatically saved to your current meal plan
          </p>
        </div>
      )}

      {/* Generate AI Plan Button (bottom) */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleGenerateAIPlan}
          disabled={isLoading}
          className="bg-black text-white px-6 py-3 rounded-md font-semibold shadow-md hover:opacity-90 disabled:opacity-50 w-full md:w-auto"
        >
          {isLoading ? "Generating…" : "Generate AI Plan"}
        </button>
      </div>
    </div>
  );
}
