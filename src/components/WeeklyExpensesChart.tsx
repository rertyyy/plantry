import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface WeeklyExpense {
  id: string;
  week_start: string;
  week_end: string;
  total_amount: number;
  item_count: number;
  created_at: string;
}

interface WeeklyExpensesChartProps {
  user: User;
}

export default function WeeklyExpensesChart({ user }: WeeklyExpensesChartProps) {
  const [expenses, setExpenses] = useState<WeeklyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeeklyExpenses();
    }
  }, [user]);

  const fetchWeeklyExpenses = async () => {
  try {
    const { data, error } = await supabase
      .from("groceries")
      .select("*")
      .eq("archived", false); // ✅ only active groceries

    if (error) throw error;

    const groceries = data || [];

    // ✅ Group groceries into weekly totals
    const weeklyMap = new Map<string, WeeklyExpense>();

    for (const item of groceries) {
      if (item.type !== "pantry") continue; // only pantry items count

      const created = new Date(item.created_at);
      const startOfWeek = new Date(created);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const key = startOfWeek.toISOString();

      const cost = Number(item.cost) * Number(item.quantity || 1);

      if (!weeklyMap.has(key)) {
        weeklyMap.set(key, {
          id: key, // no db id, so use week key
          week_start: startOfWeek.toISOString(),
          week_end: endOfWeek.toISOString(),
          total_amount: cost,
          item_count: Number(item.quantity || 1),
          created_at: item.created_at,
        });
      } else {
        const existing = weeklyMap.get(key)!;
        existing.total_amount += cost;
        existing.item_count += Number(item.quantity || 1);
      }
    }

    const grouped = Array.from(weeklyMap.values())
      .sort((a, b) => b.week_start.localeCompare(a.week_start))
      .slice(0, 8);

    setExpenses(grouped);
  } catch (error) {
    console.error("Error fetching weekly expenses:", error);
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return null;
  }

  const maxAmount = Math.max(...expenses.map((e) => e.total_amount), 1);
  return null; // ⬅️ still renders nothing (just like your original)
}
