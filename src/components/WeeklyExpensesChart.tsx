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
    return (
      <div className="apple-card p-6 rounded-xl">
        <h3 className="text-2xl font-semibold text-foreground mb-6">
          Weekly Pantry Expenses
        </h3>
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const maxAmount = Math.max(...expenses.map(e => e.total_amount), 1);

  return (
    <div className="apple-card p-6 rounded-xl">
      <h3 className="text-2xl font-semibold text-foreground mb-6">
        Weekly Pantry Expenses
      </h3>
      
      {expenses.length > 0 ? (
        <div className="space-y-4">
          {expenses.map((expense, index) => {
            const widthPercentage = (expense.total_amount / maxAmount) * 100;
            const weekStart = new Date(expense.week_start);
            const weekEnd = new Date(expense.week_end);
            
            return (
              <div key={expense.id} className="flex items-center space-x-4">
                <div className="w-24 text-sm text-muted-foreground flex flex-col">
                  <span>{weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>-</span>
                  <span>{weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-grey-200 rounded-full h-4 relative">
                    <div 
                      className="bg-primary h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${widthPercentage}%` }}
                    >
                      <span className="text-xs text-primary-foreground font-medium">
                        {expense.item_count} items
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-sm font-bold text-right text-primary">
                  ${expense.total_amount.toFixed(2)}
                </div>
              </div>
            );
          })}
          
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total tracked weeks: {expenses.length}</span>
              <span>
                Average per week: ${(expenses.reduce((sum, e) => sum + e.total_amount, 0) / expenses.length).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-lg mb-2">No weekly expenses yet</div>
          <p className="text-sm">Move items to pantry to start tracking weekly expenses</p>
        </div>
      )}
    </div>
  );
}