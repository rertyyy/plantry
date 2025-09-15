import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Calendar, DollarSign, Package, AlertTriangle, Home, Activity, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import BudgetSettings from "@/components/BudgetSettings";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [weeklyBudget, setWeeklyBudget] = useState(100);
  const [realTimeStats, setRealTimeStats] = useState({
    totalCost: 0,
    itemCount: 0,
    expiringSoon: 0,
    weeklyExpenses: [] as Array<{
      id: string;
      week_start: string;
      week_end: string;
      total_amount: number;
      item_count: number;
      created_at: string;
    }>,
    recentEntries: [] as Array<{
      id: string;
      name: string;
      cost: number;
      type: string;
      expiration_date: string;
      created_at: string;
    }>
  });

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data?.user ?? null;

      if (!currentUser) {
        navigate("/login");
        return;
      }

      // save to state so the rest of the component can use it
      setUser(currentUser);

      // define fetchRealTimeData (you can keep your existing body here)
      const fetchRealTimeData = async (user: User) => {
        try {
          // --- keep the exact body you already have here ---
          const { data: groceriesRaw, error: groceriesError } = await supabase
            .from('groceries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (groceriesError) throw groceriesError;
          const groceries = (groceriesRaw || []).map((g: any) => ({ ...g, cost: Number(g.cost) || 0, quantity: Number(g.quantity) || 0 }));

          // Fetch weekly_expenses for this user
          const { data: weeklyRaw, error: weeklyError } = await supabase
            .from('weekly_expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('week_start', { ascending: false })
            .limit(7);

          if (weeklyError) throw weeklyError;
          const weeklyExpenses = (weeklyRaw || []).map((w: any) => ({
            ...w,
            total_amount: Number(w.total_amount) || 0,
            item_count: Number(w.item_count) || 0
          }));

          // Today (midnight) for comparisons
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          // Determine which week is current (not frozen) and recalc its totals from groceries.
          const weeklyExpensesAdjusted = await Promise.all(weeklyExpenses.map(async (week) => {
            const weekEnd = new Date(week.week_end);
            weekEnd.setHours(23, 59, 59, 999); // include end of day
            const weekStart = new Date(week.week_start);
            weekStart.setHours(0,0,0,0);

            const isFrozen = weekEnd < today; // past week -> frozen

            if (!isFrozen) {
              // Recalculate current-week totals from groceries (only non-archived items)
              const itemsThisWeek = (groceries || []).filter((g: any) => {
                if (!g.created_at) return false;
                const c = new Date(g.created_at);
                return c >= weekStart && c <= weekEnd && !g.archived;
              });

              const recalculatedTotal = itemsThisWeek.reduce((sum: number, i: any) => sum + (Number(i.cost || 0) * (Number(i.quantity || 1))), 0);
              const recalculatedCount = itemsThisWeek.reduce((sum: number, i: any) => sum + (Number(i.quantity || 1)), 0);

              return { ...week, isFrozen: false, total_amount: recalculatedTotal, item_count: recalculatedCount };
            } else {
              // Past week — keep stored total (frozen)
              return { ...week, isFrozen: true };
            }
          }));

          // Compute total cost / item count / expiringSoon / recentEntries using groceries
          const totalCost = (groceries ?? []).reduce((sum: number, item: any) =>
            item.type === 'pantry' ? sum + Number(item.cost) * Number(item.quantity) : sum, 0);

          const itemCount = (groceries ?? []).reduce((sum: number, item: any) =>
            item.type === 'pantry' ? sum + Number(item.quantity) : sum, 0);

          const todayMid = new Date();
          todayMid.setHours(0,0,0,0);
          const threeDaysFromNow = new Date(todayMid);
          threeDaysFromNow.setDate(todayMid.getDate() + 3);

          const expiringSoon = (groceries ?? []).filter((item: any) => {
            if (item.type !== 'pantry') return false;
            if (!item.expiration_date) return false;
            const exp = new Date(item.expiration_date);
            exp.setHours(0,0,0,0);
            return exp >= todayMid && exp <= threeDaysFromNow;
          }).length;

          const recentEntries = (groceries ?? []).slice(0, 5);

          // Update state (use the adjusted weeklyExpenses)
          setRealTimeStats({
            totalCost,
            itemCount,
            expiringSoon,
            weeklyExpenses: weeklyExpensesAdjusted,
            recentEntries
          });
        } catch (err) {
          console.error('fetchRealTimeData failed:', err);
        }
      };

      // —> actually run it:
      await fetchRealTimeData(currentUser);
    };
    checkAuth();
  }, [navigate]);

  const stats = [
    {
      title: "Total Cost",
      value: `$${realTimeStats.totalCost.toFixed(2)}`,
      icon: DollarSign,
      trend: realTimeStats.weeklyExpenses.length > 1 && realTimeStats.weeklyExpenses[0]?.total_amount > realTimeStats.weeklyExpenses[1]?.total_amount ? "up" : "down"
    },
    {
      title: "Items Tracked",
      value: realTimeStats.itemCount.toString(),
      icon: Package,
      trend: "up"
    },
    {
      title: "Expiring Soon",
      value: realTimeStats.expiringSoon.toString(),
      change: "Next 3 days",
      icon: AlertTriangle,
      trend: realTimeStats.expiringSoon > 0 ? "warning" : "up"
    },
    {
      title: "Weekly Spending",
      value: realTimeStats.weeklyExpenses.length > 0 
        ? `$${realTimeStats.weeklyExpenses[0]?.total_amount?.toFixed(2) || '0.00'}`
        : "$0.00",
      change: "This week",
      icon: TrendingUp,
      trend: "up"
    }
  ];

  const handleBudgetUpdate = (newBudget: number) => {
    setWeeklyBudget(newBudget);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* NOTE: w-full + overflow-x-hidden added to prevent mobile overflow */}
      <div className="flex w-full overflow-x-hidden">
        {/* Sidebar (hidden on mobile, visible md+) */}
        <div className="hidden md:block w-64 bg-surface-secondary border-r border-border min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Dashboard</h2>
            
            <nav className="space-y-2">
              {[
                { name: "Overview", path: "/dashboard", icon: Home, active: true },
                { name: "Analytics", path: "/analytics", icon: BarChart3, active: false },
                { name: "Insights", path: "/insights", icon: Activity, active: false },
                { name: "Settings", path: "/settings", icon: Settings, active: false }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-3 ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-tertiary hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content - reduced padding on mobile */}
        <div className="flex-1 px-4 py-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground">
              Track your pantry expenses, manage inventory, and monitor analytics
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="apple-card p-4 sm:p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 sm:w-16 h-12 rounded-xl flex items-center justify-center ${
                    stat.trend === 'warning' ? 'bg-red-100' : 'bg-surface-tertiary'
                  }`}>
                    <stat.icon className={`w-5 sm:w-6 h-5 sm:h-6 ${
                      stat.trend === 'warning' ? 'text-red-600' : 'text-primary'
                    }`} />
                  </div>
                  <div className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' :
                    stat.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {stat.change}
                  </div>
                </div>
                
                <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">
                  {stat.title}
                </div>
              </div>
            ))}
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Budget Settings */}
            {user && (
              <BudgetSettings user={user} onBudgetUpdate={handleBudgetUpdate} />
            )}

            {/* Spending Chart */}
            <div className="apple-card p-4 sm:p-6 rounded-xl">
              <h3 className="text-2xl font-semibold text-foreground mb-6">
                Weekly Pantry Expenses
              </h3>
              
              <div className="space-y-4">
                {realTimeStats.weeklyExpenses.length > 0 ? (
                  realTimeStats.weeklyExpenses.map((expense, index) => {
                    const maxAmount = Math.max(...realTimeStats.weeklyExpenses.map(e => e.total_amount), weeklyBudget);
                    const width = `${(expense.total_amount / maxAmount) * 100}%`;
                    const weekStart = new Date(expense.week_start);
                    const budgetPercentage = (expense.total_amount / weeklyBudget) * 100;
                    
                    return (
                      <div key={expense.id} className="flex items-center space-x-4">
                        <div className="w-12 sm:w-16 text-sm text-muted-foreground">
                          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-grey-200 rounded-full h-3 relative">
                            <div 
                              className={`h-3 rounded-full transition-all duration-500 ${
                                budgetPercentage > 100 ? 'bg-red-500' : 
                                budgetPercentage > 80 ? 'bg-yellow-500' : 'bg-primary'
                              }`}
                              style={{ width }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-16 sm:w-20 text-sm font-medium text-right">
                          ${expense.total_amount.toFixed(2)}
                          <div className="text-xs text-muted-foreground">
                            {budgetPercentage.toFixed(0)}% of budget
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No weekly expense data yet</p>
                    <p className="text-sm">Add items to pantry to start tracking</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pantry Analytics */}
            <div className="apple-card p-4 sm:p-6 rounded-xl">
              <h3 className="text-2xl font-semibold text-foreground mb-6">
                Pantry Analytics
              </h3>
              
              <div className="space-y-4">
                {[
                  { 
                    category: "Current Week vs Budget", 
                    amount: realTimeStats.weeklyExpenses[0]?.total_amount || 0, 
                    width: `${Math.min((realTimeStats.weeklyExpenses[0]?.total_amount || 0) / weeklyBudget * 100, 100)}%`,
                    isAmount: true,
                    percentage: ((realTimeStats.weeklyExpenses[0]?.total_amount || 0) / weeklyBudget * 100).toFixed(1)
                  },
                  { 
                    category: "Previous Week vs Budget", 
                    amount: realTimeStats.weeklyExpenses[1]?.total_amount || 0, 
                    width: `${Math.min((realTimeStats.weeklyExpenses[1]?.total_amount || 0) / weeklyBudget * 100, 100)}%`,
                    isAmount: true,
                    percentage: ((realTimeStats.weeklyExpenses[1]?.total_amount || 0) / weeklyBudget * 100).toFixed(1)
                  },
                  { 
                    category: "Budget Remaining", 
                    amount: Math.max(weeklyBudget - (realTimeStats.weeklyExpenses[0]?.total_amount || 0), 0), 
                    width: `${Math.max(100 - ((realTimeStats.weeklyExpenses[0]?.total_amount || 0) / weeklyBudget * 100), 0)}%`,
                    isAmount: true,
                    percentage: Math.max(100 - ((realTimeStats.weeklyExpenses[0]?.total_amount || 0) / weeklyBudget * 100), 0).toFixed(1)
                  },
                  { 
                    category: "Total Weeks Tracked", 
                    amount: realTimeStats.weeklyExpenses.length, 
                    width: `${Math.min(realTimeStats.weeklyExpenses.length * 10, 100)}%`,
                    isAmount: false,
                    percentage: "100"
                  }
                ].map((data, index) => {
                  const isOverBudget = index === 0 && (realTimeStats.weeklyExpenses[0]?.total_amount || 0) > weeklyBudget;
                  const isLowBudget = index === 2 && parseFloat(data.percentage) < 20;
                  
                  return (
                    <div key={index} className="apple-surface p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-foreground">
                          {data.category}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary">
                            {data.isAmount ? `$${data.amount.toFixed(2)}` : data.amount}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {data.percentage}%
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-grey-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            isOverBudget ? 'bg-red-500' :
                            isLowBudget ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: data.width }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Entries Table */}
          <div className="apple-card rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-2xl font-semibold text-foreground">
                Recent Entries
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Latest items added to your grocery and pantry lists
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                      Item
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                      Cost
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                      Expiration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {realTimeStats.recentEntries.length > 0 ? (
                    realTimeStats.recentEntries.map((entry, index) => (
                      <tr 
                        key={entry.id}
                        className={`border-b border-border transition-colors duration-200 hover:bg-surface-secondary ${
                          index % 2 === 0 ? 'bg-background' : 'bg-surface-tertiary'
                        }`}
                      >
                        <td className="px-3 sm:px-6 py-4 text-sm text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm font-medium text-foreground">
                          {entry.name}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm font-bold text-primary">
                          ${entry.cost.toFixed(2)}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            entry.type === 'pantry' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {entry.type === 'pantry' ? 'Pantry' : 'Grocery'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-muted-foreground">
                          {new Date(entry.expiration_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 sm:px-6 py-8 text-center text-muted-foreground">
                        No entries yet. Start adding items to see them here!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
