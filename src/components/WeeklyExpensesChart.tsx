import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface WeeklyExpense {
  id: string;
  week_start: string;
  week_end: string;
  total_amount: number;
  item_count: number;
  created_at: string;
    isFrozen?: boolean;
}

interface WeeklyExpensesChartProps {
  user: User;
}

export default function WeeklyExpensesChart({ user }: WeeklyExpensesChartProps) {
  const [expenses, setExpenses] = useState<WeeklyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // track mount/unmount to avoid setState after unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchWeeklyExpenses();
    } else {
      // clear when no user
      setExpenses([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchWeeklyExpenses = async () => {
  if (!user) {
    if (isMounted.current) {
      setExpenses([]);
      setLoading(false);
    }
    return;
  }

  setLoading(true);

  try {
    const { data, error } = await supabase
      .from("weekly_expenses")
      .select("*")
      .eq("user_id", user.id)                      // <-- important: only this user's rows
      .order("week_start", { ascending: false })
      .limit(100); // larger so client-side merge doesn't accidentally miss weeks

    if (error) throw error;

    const raw = (data || []) as any[];

    // merge duplicates by week_start and normalize numeric fields
    const map = new Map<string, WeeklyExpense>();
    for (const row of raw) {
      const weekStart = row.week_start;
      const total_amount = Number(row.total_amount || 0);
      const item_count = Number(row.item_count || 0);

      if (!map.has(weekStart)) {
        map.set(weekStart, {
          id: row.id,
          week_start: row.week_start,
          week_end: row.week_end,
          total_amount,
          item_count,
          created_at: row.created_at,
        });
      } else {
        const existing = map.get(weekStart)!;
        existing.total_amount = Number(existing.total_amount || 0) + total_amount;
        existing.item_count = Number(existing.item_count || 0) + item_count;
      }
    }

    // sort descending by week_start and keep only 8
    const now = new Date();

const grouped = Array.from(map.values())
  .sort((a, b) => b.week_start.localeCompare(a.week_start))
  .slice(0, 8)
  .map(week => ({
    ...week,
    isFrozen: new Date(week.week_end) < now, // mark past weeks as frozen
    total_amount: Number(week.total_amount), // normalize
    item_count: Number(week.item_count)
  }));

if (isMounted.current) setExpenses(grouped);

  } catch (err) {
    console.error("Error fetching weekly expenses:", err);
  } finally {
    if (isMounted.current) setLoading(false);
  }
};


  if (loading) {
    return null;
  }

  const maxAmount = Math.max(...expenses.map((e) => Number(e.total_amount || 0)), 1);
  return null; // keep your chart rendering here later
}
