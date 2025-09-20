// src/pages/WeeklyPlannerPage.tsx
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const meals = ["Breakfast", "Lunch", "Dinner", "Dessert"];

type MealPlan = Record<string, Record<string, string>>;

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

  // Load pantry preview (non-archived)
  useEffect(() => {
    const fetchPantry = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userSupabase = supabase; // client uses stored auth in browser
      const { data, error } = await userSupabase
        .from("groceries")
        .select("id, name, expiration_date")
        .eq("type", "pantry")
        .eq("archived", false)
        .order("name", { ascending: true });
      if (!error && data) setPantryItemsUI(data);
    };
    fetchPantry();
  }, []);

  // Controlled input handler
  const handleChange = (day: string, meal: string, value: string) => {
    setMealPlan((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [meal]: value
      }
    }));
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

      {/* Top Quick Action Buttons (kept minimal) */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={clearPlan}
          className="px-4 py-2 border rounded-md"
        >
          Clear
        </button>
        <button
          onClick={handleShoppingList}
          className="px-4 py-2 border rounded-md"
        >
          Shopping List
        </button>
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

      {/* Quick Actions (cards) */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Save Template</h3>
            <p className="text-sm text-muted-foreground">Save this week's plan as a reusable template</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow" onClick={handleShoppingList}>
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Shopping List</h3>
            <p className="text-sm text-muted-foreground">Generate shopping list from your meal plan</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">AI Suggestions</h3>
            <p className="text-sm text-muted-foreground">AI can auto-fill meals using your pantry</p>
          </CardContent>
        </Card>
      </div>

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
