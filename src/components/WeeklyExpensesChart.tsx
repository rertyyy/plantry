// src/components/WeeklyExpensesChart.tsx
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
  // optional: how many weeks to show
  limit?: number;
  // optional: choose week start day (0 = Sunday, 1 = Monday)
  weekStartsOn?: number;
}

export default function WeeklyExpensesChart({
  user,
  limit = 8,
  weekStartsOn = 1,
}: WeeklyExpensesChartProps) {
  const [expenses, setExpenses] = useState<WeeklyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeeklyExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // normalize a date into a stable YYYY-MM-DD week-start key (local)
  function getWeekStartKey(date: string | Date, weekStartsOnLocal = weekStartsOn): string {
    const d = new Date(date);
    // compute local week-start (avoid UTC shifts by working with local date)
    const day = d.getDay();
    const diff = (day < weekStartsOnLocal ? 7 : 0) + day - weekStartsOnLocal;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    // produce stable YYYY-MM-DD key in local timezone. Use toISOString then slice UTC date
    // but toISOString is UTC — using components to produce local YYYY-MM-DD prevents timezone drift in labels
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const fetchWeeklyExpenses = async () => {
    setLoading(true);
    try {
      // fetch a bit more rows to make grouping robust (in case there are duplicates)
      const { data, error } = await supabase
        .from("weekly_expenses")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(16);

      if (error) throw error;

      const raw = (data || []) as WeeklyExpense[];

      // group map keyed by normalized week-start
      const map = new Map<string, WeeklyExpense>();

      for (const row of raw) {
        // prefer backend-provided week_start, fallback to created_at
        const sourceDate = row.week_start || row.created_at || new Date().toISOString();
        const key = getWeekStartKey(sourceDate);

        if (!map.has(key)) {
          // create normalized row: set canonical week_start to YYYY-MM-DDT00:00:00 (UTC-ish marker)
          map.set(key, {
            ...row,
            week_start: key + "T00:00:00.000Z",
            total_amount: Number(row.total_amount || 0),
            item_count: Number(row.item_count || 0),
          });
        } else {
          // aggregate totals for duplicates that fall into same canonical week
          const existing = map.get(key)!;
          existing.total_amount = Number(existing.total_amount || 0) + Number(row.total_amount || 0);
          existing.item_count = Number(existing.item_count || 0) + Number(row.item_count || 0);
          // optionally keep the earliest/latest created_at — currently keep existing
        }
      }

      // produce array, sort descending by key (newest first), and limit
      const grouped = Array.from(map.entries())
        .map(([key, val]) => val)
        .sort((a, b) => {
          // both week_start are canonical YYYY-MM-DDT00:00:00.000Z strings; compare lexicographically
          return b.week_start.localeCompare(a.week_start);
        })
        .slice(0, limit);

      setExpenses(grouped);
    } catch (err) {
      console.error("Error fetching weekly expenses:", err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // simple render — you can replace with your chart UI
  return (
    <div>
      <h3>Weekly Pantry Expenses (deduped)</h3>
      {expenses.length === 0 ? (
        <div>No weekly expense data yet</div>
      ) : (
        <ul>
          {expenses.map((e) => {
            // parse the normalized week_start for display
            const weekStartDate = new Date(e.week_start);
            const label = weekStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <li key={e.id} style={{ marginBottom: 8 }}>
                <strong>{label}</strong> — ${Number(e.total_amount).toFixed(2)} ({e.item_count} items)
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
