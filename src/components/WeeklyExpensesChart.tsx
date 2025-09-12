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
        .from('weekly_expenses')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(8);

      if (error) throw error;
      setExpenses((data || []) as WeeklyExpense[]);
    } catch (error) {
      console.error('Error fetching weekly expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // ⬅️ removed the loading box
  }

  const maxAmount = Math.max(...expenses.map(e => e.total_amount), 1);
    return null; // ⬅️ renders nothing once loaded
}
