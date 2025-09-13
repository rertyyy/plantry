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
        .from("weekly_expenses")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(16); // fetch a few more to allow deduplication

      if (error) throw error;

      const raw = (data || []) as WeeklyExpense[];

      // ✅ merge duplicates by week_start
      const map = new Map<string, WeeklyExpense>();
      for (const row of raw) {
        if (!map.has(row.week_start)) {
          map.set(row.week_start, { ...row });
        } else {
          const existing = map.get(row.week_start)!;
          existing.total_amount += Number(row.total_amount || 0);
          existing.item_count += Number(row.item_count || 0);
        }
      }

      // sort descending by week_start and keep only 8
      const grouped = Array.from(map.values())
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
