// src/pages/WeeklyPlannerPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { Calendar, Save, FolderOpen, RotateCw, Plus, Tag } from "lucide-react";
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
const DRAFT_KEY = "weekly_mealplan_draft";

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

  // saved meals state
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [savedMealsDialogOpen, setSavedMealsDialogOpen] = useState(false);
  const [savedMealsLoading, setSavedMealsLoading] = useState(false);
  const targetCellRef = useRef<{ day: string; meal: string } | null>(null);

  // undo
  const undoActionRef = useRef<{ kind: string; data: any } | null>(null);
  const [showUndoPill, setShowUndoPill] = useState(false);
  const undoTimerRef = useRef<number | null>(null);

  // auto-save debounce
  const saveTimer = useRef<number | null>(null);

  // quick-add popover target (day, meal) or null
  const [quickAddTarget, setQuickAddTarget] = useState<{ day: string; meal: string } | null>(null);

  // common quick-add suggestions (small, unobtrusive)
  const commonMeals = ["Peanut Butter Toast", "Cucumber Salad", "Tomato Soup", "Carrot Soup", "Coffee", "Cake"];

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: pantryData, error: pantryError } = await supabase
        .from("groceries")
        .select("id, name, expiration_date")
        .eq("type", "pantry")
        .eq("archived", false)
        .order("name", { ascending: true });

      if (!pantryError && pantryData) setPantryItemsUI(pantryData);

      const { data: plansData, error: plansError } = await (supabase as any)
        .from("pastmealplans")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!plansError && plansData) setSavedPlans(plansData as SavedMealPlan[]);
    };
    fetchData();
  }, []);

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

  useEffect(() => {
    fetchSavedMeals();
  }, [fetchSavedMeals]);

  const showUndoPillFor = (kind: string, data: any, toastTitle: string, toastDesc?: string) => {
    undoActionRef.current = { kind, data };
    toast({ title: toastTitle, description: toastDesc });
    setShowUndoPill(true);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = window.setTimeout(() => {
      setShowUndoPill(false);
      undoActionRef.current = null;
      undoTimerRef.current = null;
    }, 6000);
  };

  const performUndo = async () => {
    const action = undoActionRef.current;
    if (!action) return;
    try {
      if (action.kind === "cell") {
        const { day, meal, prevValue } = action.data;
        setMealPlan((prev) => ({ ...prev, [day]: { ...prev[day], [meal]: prevValue } }));
      } else if (action.kind === "plan") {
        const prevPlan = action.data.prevPlan;
        if (prevPlan) setMealPlan(JSON.parse(prevPlan));
      } else if (action.kind === "saved_insert") {
        const id = action.data.id;
        if (id) {
          await supabase.from("savedmeals").delete().eq("id", id);
          await fetchSavedMeals();
        }
      } else if (action.kind === "saved_delete") {
        const { title } = action.data;
        if (title) {
          await supabase.from("savedmeals").insert({ title, user_id: action.data.user_id ?? null });
          await fetchSavedMeals();
        }
      }
      toast({ title: "Restored", description: "Previous value restored." });
    } catch (err: any) {
      console.error("performUndo error:", err);
      toast({ title: "Undo failed", description: err?.message || String(err), variant: "destructive" });
    } finally {
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

      await fetchSavedMeals();
      showUndoPillFor("saved_insert", { id: data.id }, "Meal saved!", `\"${value.trim()}\" saved to your recipes.`);
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

  const handleSelectSavedMeal = (saved: SavedMeal) => {
    try {
      const target = targetCellRef.current;
      if (!target) {
        setSavedMealsDialogOpen(false);
        return;
      }
      const prevValue = mealPlan[target.day]?.[target.meal] ?? "";
      undoActionRef.current = { kind: "cell", data: { day: target.day, meal: target.meal, prevValue } };
      setMealPlan((prev) => ({ ...prev, [target.day]: { ...prev[target.day], [target.meal]: saved.title ?? "" } }));
      setSavedMealsDialogOpen(false);
      targetCellRef.current = null;
      showUndoPillFor("cell", { day: target.day, meal: target.meal, prevValue }, "Item added!", `\"${saved.title}\" added.`);
    } catch (err: any) {
      console.error("handleSelectSavedMeal error:", err);
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const deleteSavedMeal = async (id: string) => {
    try {
      const toDelete = savedMeals.find((s) => s.id === id);
      const deletedTitle = toDelete?.title ?? null;
      const { error } = await supabase.from("savedmeals").delete().eq("id", id);
      if (error) throw error;
      await fetchSavedMeals();
      showUndoPillFor("saved_delete", { title: deletedTitle, user_id: undefined }, "Deleted", "Saved meal deleted.");
    } catch (err: any) {
      console.error("deleteSavedMeal error:", err);
      toast({ title: "Delete failed", description: err?.message || String(err), variant: "destructive" });
    }
  };

  const autoSave = useCallback(async (updatedPlan: MealPlan) => {
    if (!currentPlanId) return;
    try {
      await (supabase as any)
        .from("pastmealplans")
        .update({ meal_plan: updatedPlan, updated_at: new Date().toISOString() })
        .eq("id", currentPlanId);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, [currentPlanId]);

  const handleChange = (day: string, meal: string, value: string) => {
    setMealPlan((prev) => {
      const updated = { ...prev, [day]: { ...prev[day], [meal]: value } };
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        autoSave(updated);
        saveTimer.current = null;
      }, 1000);
      return updated;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const isAllEmpty = Object.values(mealPlan).every((dayMap) => Object.values(dayMap).every((v) => !v || String(v).trim() === ""));
      if (isAllEmpty && parsed && typeof parsed === "object") setMealPlan(parsed);
    } catch (err) {
      console.warn("Failed to load meal plan draft:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = window.setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(mealPlan)); } catch (err) { console.warn(err); }
    }, 500);
    return () => window.clearTimeout(t);
  }, [mealPlan]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
      if (undoTimerRef.current) { window.clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    };
  }, []);

  const handleGenerateAIPlan = async () => {
    setIsLoading(true);
    try {
      const body = { userMessage: "Please create a weekly meal plan using pantry items.", pantryItems: pantryItemsUI.map(p => ({ name: p.name, expiration_date: p.expiration_date })) };
      const { data, error } = await supabase.functions.invoke("generate-mealplan", { body });
      if (error) throw error;
      if (!data) throw new Error("No data returned from generate-mealplan");
      const { mealPlan: remotePlan, shoppingNeeded, aiMessage } = data;
      if (!remotePlan) throw new Error("Invalid meal plan returned");
      const prevPlanJSON = JSON.stringify(mealPlan);
      setMealPlan((prev) => {
        const next: MealPlan = {} as MealPlan;
        days.forEach((d) => { next[d] = {}; meals.forEach((m) => { const remoteVal = remotePlan?.[d]?.[m]; next[d][m] = remoteVal && remoteVal !== "SHOPPING NEEDED" ? remoteVal : prev[d]?.[m] ?? ""; }); });
        return next;
      });
      showUndoPillFor("plan", { prevPlan: prevPlanJSON }, shoppingNeeded ? "Partial Fill — Shopping Needed" : "Weekly Plan Filled", aiMessage || (shoppingNeeded ? "Some slots require shopping." : "Your week is filled using pantry items."));
    } catch (err: any) {
      console.error("generate-mealplan error:", err);
      toast({ title: "Failed to generate plan", description: err?.message || "Something went wrong", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const saveMealPlan = async () => {
    if (!saveName.trim()) { toast({ title: "Error", description: "Please enter a name for your meal plan", variant: "destructive" }); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { toast({ title: "Error", description: "Please log in to save meal plans", variant: "destructive" }); return; }
    const nameToSave = saveName.trim();
    try {
      const { data, error } = await (supabase as any)
        .from("pastmealplans")
        .insert({ name: nameToSave, meal_plan: mealPlan, user_id: session.user.id })
        .select()
        .single();
      if (error) throw error;
      setCurrentPlanId(data.id);
      setSavedPlans(prev => [data as SavedMealPlan, ...prev]);
      setSaveName("");
      setSaveDialogOpen(false);
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      toast({ title: "Saved", description: `Meal plan "${nameToSave}" saved successfully` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadMealPlan = (plan: SavedMealPlan) => {
    const prevPlanJSON = JSON.stringify(mealPlan);
    setMealPlan(plan.meal_plan);
    setCurrentPlanId(plan.id);
    setLoadDialogOpen(false);
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    showUndoPillFor("plan", { prevPlan: prevPlanJSON }, "Loaded", `Meal plan "${plan.name}" loaded`);
  };

  const deleteMealPlan = async (planId: string) => {
    try {
      const planToDelete = savedPlans.find((p) => p.id === planId);
      const { error } = await (supabase as any).from("pastmealplans").delete().eq("id", planId);
      if (error) throw error;
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (currentPlanId === planId) setCurrentPlanId(null);
      showUndoPillFor("saved_delete", { title: planToDelete?.name ?? null, meal_plan: planToDelete?.meal_plan ?? null, user_id: planToDelete?.user_id ?? null }, "Deleted", "Meal plan deleted");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const clearPlan = () => {
    const prevPlanJSON = JSON.stringify(mealPlan);
    const empty: MealPlan = {} as MealPlan;
    days.forEach((d) => { empty[d] = {}; meals.forEach((m) => (empty[d][m] = "")); });
    setMealPlan(empty);
    setCurrentPlanId(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    showUndoPillFor("plan", { prevPlan: prevPlanJSON }, "Cleared", "Weekly plan cleared.");
  };

  // Quick insert helper for quick-add popover
  const quickInsert = (day: string, meal: string, value: string) => {
    const prevValue = mealPlan[day]?.[meal] ?? "";
    undoActionRef.current = { kind: "cell", data: { day, meal, prevValue } };
    setMealPlan((prev) => ({ ...prev, [day]: { ...prev[day], [meal]: value } }));
    setQuickAddTarget(null);
    showUndoPillFor("cell", { day, meal, prevValue }, "Added", `\"${value}\" added.`);
  };

  // small helper: whether a cell mentions any pantry item
  const cellHasPantryMatch = (text: string) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return pantryItemsUI.some(p => lower.includes(String(p.name).toLowerCase()));
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
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Enter plan name..." onKeyDown={(e) => e.key === "Enter" && saveMealPlan()} />
              <div className="flex gap-2">
                <Button type="button" onClick={saveMealPlan} disabled={!saveName.trim()}>Save</Button>
                <Button type="button" variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
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
                      <p className="text-sm text-muted-foreground">{new Date(plan.updated_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => loadMealPlan(plan)}>Load</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => deleteMealPlan(plan.id)}>Delete</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Button type="button" variant="outline" onClick={clearPlan}>Clear</Button>

        <Button type="button" variant="ghost" className="ml-auto" onClick={() => handleGenerateAIPlan()} disabled={isLoading}>
          <Tag className="w-4 h-4 mr-2" />
          {isLoading ? "Generating…" : "Generate AI Plan"}
        </Button>
      </div>

      {/* Desktop table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] hidden md:table">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left p-4 font-semibold text-foreground border-r border-border w-36 sticky top-0 z-20 bg-surface">Meal</th>
                  {days.map((day) => (
                    <th key={day} className="text-center p-4 font-semibold text-foreground border-r border-border last:border-r-0 sticky top-0 z-20 bg-surface">
                      <div className="text-sm">{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {meals.map((meal, mealIndex) => (
                  <tr key={meal} className={`border-b border-border last:border-b-0 ${mealIndex % 2 === 0 ? 'bg-surface/30' : 'bg-background'}`}>
                    <td className="p-4 font-medium text-foreground border-r border-border bg-surface/50 flex items-center gap-2">
                      <span className={`w-2 h-8 rounded mr-2 ${mealIndex === 0 ? 'bg-yellow-400' : mealIndex === 1 ? 'bg-green-400' : mealIndex === 2 ? 'bg-orange-400' : 'bg-pink-300'}`}></span>
                      {meal}
                    </td>
                    {days.map((day) => (
                      <td key={`${meal}-${day}`} className="p-4 border-r border-border last:border-r-0 align-top">
                        <div className="relative group min-h-[88px] w-full">
                          {/* pantry match indicator */}
                          {cellHasPantryMatch(mealPlan[day]?.[meal] ?? "") && (
                            <span className="absolute left-2 top-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">In pantry</span>
                          )}

                          {/* quick actions (appear on hover) */}
                          <div className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button type="button" title="Load saved meal" onClick={() => openSavedMealsModalForCell(day, meal)} className="p-1 rounded-full hover:bg-surface/80" aria-label={`Load saved meal for ${day} ${meal}`}>
                              <RotateCw className="w-4 h-4 text-black" />
                            </button>
                            <button type="button" title="Save this meal" onClick={() => saveMeal(day, meal)} className="p-1 rounded-full hover:opacity-90 flex items-center justify-center" aria-label={`Save meal ${day} ${meal}`} style={{ backgroundColor: "#3672ff" }}>
                              <Save className="w-4 h-4 text-white" />
                            </button>
                            <button type="button" title="Quick add" onClick={() => setQuickAddTarget({ day, meal })} className="p-1 rounded-full hover:bg-surface/80" aria-label={`Quick add for ${day} ${meal}`}>
                              <Plus className="w-4 h-4 text-black" />
                            </button>
                          </div>

                          <textarea value={mealPlan[day]?.[meal] ?? ""} onChange={(e) => handleChange(day, meal, e.target.value)} className="w-full h-full min-h-[88px] resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-md p-2" placeholder="Add meal..." />

                          {/* Quick add popup (simple) */}
                          {quickAddTarget && quickAddTarget.day === day && quickAddTarget.meal === meal && (
                            <div className="absolute right-2 bottom-12 z-40 w-56 bg-white border rounded-md shadow p-2">
                              <div className="text-xs text-muted-foreground mb-2">Quick add</div>
                              <div className="flex flex-col gap-1">
                                {commonMeals.map((c) => (
                                  <button key={c} onClick={() => quickInsert(day, meal, c)} className="text-left px-2 py-1 rounded hover:bg-surface">{c}</button>
                                ))}
                                <div className="border-t pt-2 text-xs text-muted-foreground">Pantry</div>
                                {pantryItemsUI.slice(0,6).map(p => (
                                  <button key={p.id} onClick={() => quickInsert(day, meal, p.name)} className="text-left px-2 py-1 rounded hover:bg-surface truncate">{p.name}</button>
                                ))}
                                <div className="flex justify-end mt-2">
                                  <button onClick={() => setQuickAddTarget(null)} className="text-sm px-2 py-1">Close</button>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile stacked view (simple, less overwhelming) */}
            <div className="md:hidden space-y-4">
              {days.map((day) => (
                <Card key={day} className="p-0">
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{day}</h3>
                      <div className="text-sm text-muted-foreground">{pantryItemsUI.length} pantry items</div>
                    </div>
                    <div className="grid gap-2">
                      {meals.map((meal) => (
                        <div key={`${day}-${meal}`} className="p-3 border rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-6 rounded ${meal === 'Breakfast' ? 'bg-yellow-400' : meal === 'Lunch' ? 'bg-green-400' : meal === 'Dinner' ? 'bg-orange-400' : 'bg-pink-300'}`}></span>
                              <div className="font-medium">{meal}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => openSavedMealsModalForCell(day, meal)} className="p-1 rounded hover:bg-surface/80"><RotateCw className="w-4 h-4" /></button>
                              <button onClick={() => saveMeal(day, meal)} className="p-1 rounded hover:opacity-90" style={{ backgroundColor: '#3672ff' }}><Save className="w-4 h-4 text-white" /></button>
                              <button onClick={() => setQuickAddTarget({ day, meal })} className="p-1 rounded hover:bg-surface/80"><Plus className="w-4 h-4" /></button>
                            </div>
                          </div>
                          <textarea value={mealPlan[day]?.[meal] ?? ""} onChange={(e) => handleChange(day, meal, e.target.value)} className="w-full resize-none border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none rounded-md p-2" placeholder="Add meal..." />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Status indicator */}
      {currentPlanId && (
        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">✓ Changes are automatically saved to your current meal plan</p>
        </div>
      )}

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
          <button type="button" onClick={performUndo} className="px-3 py-2 rounded-full bg-black text-white font-medium shadow">Undo</button>
        </div>
      )}

    </div>
  );
}
