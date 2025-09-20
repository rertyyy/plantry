// src/pages/WeeklyPlannerPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Calendar, Save, FolderOpen, RotateCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

type SavedMeal = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
};

// <--- NEW: local draft key
const DRAFT_KEY = "weekly_mealplan_draft";

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

  // --- New: saved meals state + modal + target cell + undo
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [savedMealsDialogOpen, setSavedMealsDialogOpen] = useState(false);
  const [savedMealsLoading, setSavedMealsLoading] = useState(false);
  const targetCellRef = useRef<{ day: string; meal: string } | null>(null);

  // Generalized undo action ref:
  // { kind: 'cell'|'plan'|'saved_insert'|'saved_delete', data: any }
  const undoActionRef = useRef<{ kind: string; data: any } | null>(null);

  // Undo pill UI
  const [showUndoPill, setShowUndoPill] = useState(false);
  const undoTimerRef = useRef<number | null>(null);

  // debounce timer ref for auto-save
  const saveTimer = useRef<number | null>(null);

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

      // Fetch saved meal plans (RLS will ensure user-only rows)
      const { data: plansData, error: plansError } = await (supabase as any)
        .from("pastmealplans")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!plansError && plansData) setSavedPlans(plansData as SavedMealPlan[]);
    };
    fetchData();
  }, []);

  // -----------------------
  // Saved meals helpers
  // -----------------------
  const fetchSavedMeals = useCallback(async () => {
    setSavedMealsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSavedMeals([]);
        setSavedMealsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from<SavedMeal>("savedmeals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSavedMeals(data ?? []);
    } catch (err: any) {
      console.error("fetchSavedMeals error:", err);
      toast({ title: "Failed to load saved meals", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setSavedMealsLoading(false);
    }
  }, [toast]);

  // fetch saved meals on mount so modal opens fast
  useEffect(() => {
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  // ---- helper: show undo pill and schedule hide ----
  const showUndoPillFor = (kind: string, data: any, toastTitle: string, toastDesc?: string) => {
    // store undo action
    undoActionRef.current = { kind, data };

    // show toast (simple)
    toast({
      title: toastTitle,
      description: toastDesc,
    });

    // show pill UI
    setShowUndoPill(true);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    // hide after 6s
    undoTimerRef.current = window.setTimeout(() => {
      setShowUndoPill(false);
      undoActionRef.current = null;
      undoTimerRef.current = null;
    }, 6000);
  };

  // ---- helper: perform undo based on undoActionRef ----
  const performUndo = async () => {
    const action = undoActionRef.current;
    if (!action) return;
    try {
      if (action.kind === "cell") {
        const { day, meal, prevValue } = action.data;
        setMealPlan((prev) => ({
          ...prev,
          [day]: { ...prev[day], [meal]: prevValue },
        }));
      } else if (action.kind === "plan") {
        const prevPlan = action.data.prevPlan;
        if (prevPlan) {
          setMealPlan(JSON.parse(prevPlan));
        }
      } else if (action.kind === "saved_insert") {
        // undo a recently inserted savedmeal by deleting it
        const id = action.data.id;
        if (id) {
          await supabase.from("savedmeals").delete().eq("id", id);
          await fetchSavedMeals();
        }
      } else if (action.kind === "saved_delete") {
        // undo a deleted savedmeal by reinserting it (title required)
        const { title } = action.data;
        if (title) {
          await supabase.from("savedmeals").insert({ title, user_id: action.data.user_id ?? null });
          await fetchSavedMeals();
        }
      }
      // success feedback
      toast({ title: "Restored", description: "Previous value restored." });
    } catch (err: any) {
      console.error("performUndo error:", err);
      toast({ title: "Undo failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
      // clear undo state and hide pill
      undoActionRef.current = null;
      setShowUndoPill(false);
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    }
  };

  const saveMeal = async (day: string, meal: string) => {
    const value = mealPlan[day]?.[meal] ?? "";
    if (!value.trim()) {
      toast({ title: "Empty", description: "Cannot save an empty meal", variant: "destructive" });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: "Not logged in", description: "Please log in to save meals", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("savedmeals")
        .insert({ title: value.trim(), user_id: session.user.id })
        .select()
        .single();

      if (error) throw error;

      // refresh saved meals
      await fetchSavedMeals();

      // show toast + undo pill that lets user delete the inserted saved meal
      showUndoPillFor("saved_insert", { id: data.id }, "Meal saved!", `"${value.trim()}" saved to your recipes.`);
    } catch (err: any) {
      console.error("saveMeal error:", err);
      toast({ title: "Save failed", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const openSavedMealsModalForCell = (day: string, meal: string) => {
    targetCellRef.current = { day, meal };
    setSavedMealsDialogOpen(true);
    fetchSavedMeals();
  };

  // === MINIMAL FIX: safe handler to avoid crashes ===
  const handleSelectSavedMeal = (saved: SavedMeal) => {
    try {
      const target = targetCellRef.current;
      if (!target) {
        // nothing to do
        setSavedMealsDialogOpen(false);
        return;
      }

      const prevValue = mealPlan[target.day]?.[target.meal] ?? "";
      // set undo action (cell)
      undoActionRef.current = { kind: "cell", data: { day: target.day, meal: target.meal, prevValue } };

      // replace cell
      setMealPlan((prev) => ({
        ...prev,
        [target.day]: { ...prev[target.day], [target.meal]: saved.title ?? "" },
      }));

      setSavedMealsDialogOpen(false);
      targetCellRef.current = null;

      // show toast + undo pill (cell-level undo)
      showUndoPillFor("cell", { day: target.day, meal: target.meal, prevValue }, "Item added!", `"${saved.title}" added.`);
    } catch (err: any) {
      console.error("handleSelectSavedMeal error:", err);
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const deleteSavedMeal = async (id: string) => {
    try {
      // capture deleted row (from local cache) for undo
      const toDelete = savedMeals.find((s) => s.id === id);
      const deletedTitle = toDelete?.title ?? null;
      const { error } = await supabase.from("savedmeals").delete().eq("id", id);
      if (error) throw error;
      await fetchSavedMeals();
      // show undo pill to reinsert the saved meal (title used)
      showUndoPillFor("saved_delete", { title: deletedTitle, user_id: undefined }, "Deleted", "Saved meal deleted.");
    } catch (err: any) {
      console.error("deleteSavedMeal error:", err);
      toast({ title: "Delete failed", description: err?.message || String(err), variant: "destructive" });
    }
  };

  // -----------------------
  // Auto-save (existing code)
  // -----------------------
  const autoSave = useCallback(async (updatedPlan: MealPlan) => {
    // only auto-save when there's a plan row to update
    if (!currentPlanId) return;
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

  // Controlled input handler with debounce
  const handleChange = (day: string, meal: string, value: string) => {
    setMealPlan((prev) => {
      const updated = {
        ...prev,
        [day]: {
          ...prev[day],
          [meal]: value
        }
      };

      // Debounce: clear previous timer and set a new one
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      saveTimer.current = window.setTimeout(() => {
        autoSave(updated);
        saveTimer.current = null;
      }, 1000);

      return updated;
    });
  };

  // --- NEW: load draft from localStorage on mount if table currently empty
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      // only apply draft if the current in-memory table is "all empty"
      const isAllEmpty = Object.values(mealPlan).every((dayMap) =>
        Object.values(dayMap).every((v) => !v || String(v).trim() === "")
      );
      if (isAllEmpty && parsed && typeof parsed === "object") {
        setMealPlan(parsed);
      }
    } catch (err) {
      // ignore parse errors
      console.warn("Failed to load meal plan draft:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  // --- NEW: persist draft to localStorage when mealPlan changes (debounced)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(mealPlan));
      } catch (err) {
        console.warn("Failed to write meal plan draft:", err);
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [mealPlan]);

  // cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    };
  }, []);

  // -----------------------
  // Remaining original functions unchanged
  // (generate AI plan, save/load/delete plan, shopping list, clear, etc.)
  // -----------------------

  const handleGenerateAIPlan = async () => {
    setIsLoading(true);
    try {
      const body = {
        userMessage: "Please create a weekly meal plan using pantry items.",
        pantryItems: pantryItemsUI.map(p => ({ name: p.name, expiration_date: p.expiration_date }))
      };

      const { data, error } = await supabase.functions.invoke("generate-mealplan", { body });

      if (error) throw error;
      if (!data) throw new Error("No data returned from generate-mealplan");

      const { mealPlan: remotePlan, shoppingNeeded, aiMessage } = data;

      if (!remotePlan) throw new Error("Invalid meal plan returned");

      // Save previous full plan for undo
      const prevPlanJSON = JSON.stringify(mealPlan);

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
              next[d][m] = prev[d]?.[m] ?? "";
            }
          });
        });
        return next;
      });

      // register undo for the whole plan replacement
      showUndoPillFor("plan", { prevPlan: prevPlanJSON }, shoppingNeeded ? "Partial Fill — Shopping Needed" : "Weekly Plan Filled", aiMessage || (shoppingNeeded ? "Some slots require shopping." : "Your week is filled using pantry items."));

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

    const nameToSave = saveName.trim();

    try {
      const { data, error } = await (supabase as any)
        .from("pastmealplans")
        .insert({
          name: nameToSave,
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

      // remove local draft now that we've persisted
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}

      // show toast (no undo for plan save)
      toast({ title: "Saved", description: `Meal plan "${nameToSave}" saved successfully` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadMealPlan = (plan: SavedMealPlan) => {
    // store prev plan for undo
    const prevPlanJSON = JSON.stringify(mealPlan);
    setMealPlan(plan.meal_plan);
    setCurrentPlanId(plan.id);
    setLoadDialogOpen(false);

    // remove local draft because user intentionally loaded a saved plan
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}

    // register undo for full plan load
    showUndoPillFor("plan", { prevPlan: prevPlanJSON }, "Loaded", `Meal plan "${plan.name}" loaded`);
  };

  const deleteMealPlan = async (planId: string) => {
    try {
      // capture plan for undo if present locally
      const planToDelete = savedPlans.find((p) => p.id === planId);
      const { error } = await (supabase as any)
        .from("pastmealplans")
        .delete()
        .eq("id", planId);

      if (error) throw error;

      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (currentPlanId === planId) setCurrentPlanId(null);

      // allow undo: reinsert plan (we store the plan object)
      showUndoPillFor("saved_delete", { title: planToDelete?.name ?? null, meal_plan: planToDelete?.meal_plan ?? null, user_id: planToDelete?.user_id ?? null }, "Deleted", "Meal plan deleted");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleShoppingList = () => {
    toast({ title: "Shopping list", description: "This feature is not implemented yet." });
  };

  const clearPlan = () => {
    const prevPlanJSON = JSON.stringify(mealPlan);
    const empty: MealPlan = {};
    days.forEach((d) => {
      empty[d] = {};
      meals.forEach((m) => (empty[d][m] = ""));
    });
    setMealPlan(empty);
    setCurrentPlanId(null);

    // remove local draft because user intentionally cleared
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}

    // register undo for clear
    showUndoPillFor("plan", { prevPlan: prevPlanJSON }, "Cleared", "Weekly plan cleared.");
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
            <Button type="button" variant="outline" className="flex items-center gap-2">
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
                <Button type="button" onClick={saveMealPlan} disabled={!saveName.trim()}>
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="flex items-center gap-2">
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
                      <Button type="button" size="sm" onClick={() => loadMealPlan(plan)}>
                        Load
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => deleteMealPlan(plan.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button type="button" variant="outline" onClick={clearPlan}>
          Clear
        </Button>

        <Button type="button" variant="outline" onClick={handleShoppingList}>
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
                        <div className="relative group min-h-[80px] w-full">
                          {/* hover-only small buttons in top-right */}
                          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            {/* Load (rotate arrows) - black icon */}
                            <button
                              type="button"
                              title="Load saved meal"
                              onClick={() => openSavedMealsModalForCell(day, meal)}
                              className="p-1 rounded-full hover:bg-surface/80"
                              aria-label={`Load saved meal for ${day} ${meal}`}
                            >
                              <RotateCw className="w-4 h-4 text-black" />
                            </button>

                            {/* Save (blue) */}
                            <button
                              type="button"
                              title="Save this meal"
                              onClick={() => saveMeal(day, meal)}
                              className="p-1 rounded-full hover:opacity-90 flex items-center justify-center"
                              aria-label={`Save meal ${day} ${meal}`}
                              style={{ backgroundColor: "#0ea5e9" }}
                            >
                              <Save className="w-4 h-4 text-white" />
                            </button>
                          </div>

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
          type="button"
          onClick={handleGenerateAIPlan}
          disabled={isLoading}
          className="bg-black text-white px-6 py-3 rounded-md font-semibold shadow-md hover:opacity-90 disabled:opacity-50 w-full md:w-auto"
        >
          {isLoading ? "Generating…" : "Generate AI Plan"}
        </button>
      </div>

      {/* Saved meals modal (small) */}
      <Dialog open={savedMealsDialogOpen} onOpenChange={(v) => setSavedMealsDialogOpen(v)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Saved Meals</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {savedMealsLoading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : savedMeals.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No saved meals yet</p>
            ) : (
              savedMeals.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex-1">
                    <h4 className="font-medium truncate">{s.title}</h4>
                    <p className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={() => handleSelectSavedMeal(s)}>Load</Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => deleteSavedMeal(s.id)}>Delete</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* UNDO pill (black rounded button) */}
      {showUndoPill && (
        <div className="fixed right-6 bottom-6 z-50">
          <button
            type="button"
            onClick={performUndo}
            className="px-3 py-2 rounded-full bg-black text-white font-medium shadow"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
