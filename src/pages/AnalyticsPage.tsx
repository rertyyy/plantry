import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, 
  Calendar, Clock, AlertTriangle, BarChart3, Activity, Home, Settings
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklySpending, setWeeklySpending] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [expirationData, setExpirationData] = useState<any[]>([]);
  const [statistics, setStatistics] = useState({
  totalSpent: 0,
  monthlyTotal: 0,             // added
  currentMonthLabel: '',       // added
  averageWeeklySpend: 0,
  mostExpensiveItem: { name: "", cost: 0 },
  totalItems: 0,
  pantryItems: 0,
  groceryItems: 0,
  expiredItems: 0,
  expiringThisWeek: 0,
  averageItemCost: 0,
  budgetCompliance: 0,
  weeklyBudget: 100
});

  useEffect(() => {
    const checkAuthAndSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      
      // Temporarily bypass subscription check for development
      // First check local database for subscription status
      const { data: localSubscription } = await supabase
        .from('paypal_subscribers')
        .select('subscribed, subscription_tier, subscription_end')
        .eq('user_id', user.id)
        .single();
        
      // Bypass subscription check - allow access for now
      fetchAnalyticsData(user);
      return;
      
      /* COMMENTED OUT SUBSCRIPTION CHECK
      if (localSubscription?.subscribed && 
          (localSubscription.subscription_tier === "Pro" || localSubscription.subscription_tier === "Pro Annual")) {
        // User has Pro subscription in database
        fetchAnalyticsData(user);
        return;
      }
      
      // If not in database or not subscribed, check with PayPal
      const { data, error } = await supabase.functions.invoke("paypal-verify-subscription");
      if (!data?.subscribed || (data.subscription_tier !== "Pro" && data.subscription_tier !== "Pro Annual")) {
        navigate("/pricing");
        return;
      }
      
      fetchAnalyticsData(user);
      */
    };
    checkAuthAndSubscription();
  }, [navigate]);

  const fetchAnalyticsData = async (user: User) => {
    try {
      setLoading(true);

      // Fetch all groceries
      const { data: groceries, error: groceriesError } = await supabase
        .from('groceries')
        .select('*')
        .order('created_at', { ascending: false });

      if (groceriesError) throw groceriesError;

      // Fetch weekly expenses
      const { data: weeklyExpenses, error: expensesError } = await supabase
        .from('weekly_expenses')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(12); // Get last 12 weeks

      if (expensesError) throw expensesError;

      // Fetch user settings for budget
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('weekly_budget')
        .single();

      const weeklyBudget = settings?.weekly_budget || 100;

      // Process weekly spending data
      const weeklyData = weeklyExpenses?.map(week => ({
        week: new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spending: week.total_amount,
        budget: weeklyBudget,
        items: week.item_count
      })).reverse() || [];

      setWeeklySpending(weeklyData);

      // Process category breakdown
      const pantryItems = groceries?.filter(item => item.type === 'pantry' && !item.archived) || [];
      const groceryItems = groceries?.filter(item => item.type === 'grocery' && !item.archived) || [];
      
      setCategoryBreakdown([
        { name: 'Pantry', value: pantryItems.reduce((sum, item) => sum + (Number(item.cost) * (item.quantity || 1)), 0), count: pantryItems.reduce((sum, item) => sum + (item.quantity || 1), 0) },
        { name: 'Grocery', value: groceryItems.reduce((sum, item) => sum + (Number(item.cost) * (item.quantity || 1)), 0), count: groceryItems.reduce((sum, item) => sum + (item.quantity || 1), 0) }
      ]);

     
      // Process expiration data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const expirationGroups = {
        expired: 0,
        today: 0,
        thisWeek: 0,
        nextWeek: 0,
        later: 0
      };

      pantryItems.forEach(item => {
        const expirationDate = new Date(item.expiration_date);
        expirationDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff < 0) expirationGroups.expired += (item.quantity || 1);
        else if (daysDiff === 0) expirationGroups.today += (item.quantity || 1);
        else if (daysDiff <= 7) expirationGroups.thisWeek += (item.quantity || 1);
        else if (daysDiff <= 14) expirationGroups.nextWeek += (item.quantity || 1);
        else expirationGroups.later += (item.quantity || 1);
      });

      setExpirationData([
        { name: 'Expired', value: expirationGroups.expired, color: '#ef4444' },
        { name: 'Today', value: expirationGroups.today, color: '#f59e0b' },
        { name: 'This Week', value: expirationGroups.thisWeek, color: '#eab308' },
        { name: 'Next Week', value: expirationGroups.nextWeek, color: '#3b82f6' },
        { name: 'Later', value: expirationGroups.later, color: '#10b981' }
      ]);

      
      // ---- REPLACEMENT: robust monthly totals + stats (pantry-only) ----
              const ONLY_PANTRY = true; // set false to include grocery type too
              const MONTHS_TO_KEEP = 12;
              
              // Build monthly totals grouped by YYYY-MM (reliable sorting key)
              const monthlyMap = new Map<string, { total: number; items: number; label: string }>();
              
              (groceries || [])
              .filter(it => (ONLY_PANTRY ? it.type === 'pantry' : true))
              .forEach(item => {
                const d = item.created_at ? new Date(item.created_at) : item.updated_at ? new Date(item.updated_at) : new Date();
                const year = d.getFullYear();
                const monthNum = d.getMonth() + 1; // 1..12
                const key = `${year}-${String(monthNum).padStart(2, '0')}`; // YYYY-MM
                const label = d.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g. "Sep 2025"
            
                const qty = Number(item.quantity ?? 1) || 1;
                const parsedCost = Number(item.cost);
                const unitCost = Number.isFinite(parsedCost) ? parsedCost : 0;
                const cost = unitCost * qty;
            
                const existing = monthlyMap.get(key);
                if (existing) {
                  existing.total += cost;
                  existing.items += qty;
                } else {
                  monthlyMap.set(key, { total: cost, items: qty, label });
                }
              });
              
              // Convert map -> array, sort chronological (old -> new), keep last N months
              const monthlyArr = Array.from(monthlyMap.entries())
                .map(([key, v]) => ({
                  key,
                  month: v.label,
                  total: Math.round((v.total + Number.EPSILON) * 100) / 100,
                  items: v.items,
                  average: v.items > 0 ? Math.round(((v.total / v.items) + Number.EPSILON) * 100) / 100 : 0
                }))
                .sort((a, b) => a.key.localeCompare(b.key))
                .slice(-MONTHS_TO_KEEP);
              
              // Provide data to chart (chart expects chronological left->right)
              setMonthlyTrends(monthlyArr);
              
              // Compute current month key and entry for the stat card
              const currentMonthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
              const currentMonthEntry = monthlyArr.find(m => m.key === currentMonthKey) ?? { total: 0, average: 0, items: 0 };
              const monthlyTotal = currentMonthEntry.total;
              const currentMonthLabel = currentMonthEntry.month || new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
              
              // Recompute / compute statistics (safe numeric parsing, round to cents where useful)
              const totalSpent = (groceries || []).reduce((sum, item) => {
                const qty = Number(item.quantity ?? 1) || 1;
                const parsed = Number(item.cost);
                const unit = Number.isFinite(parsed) ? parsed : 0;
                return sum + unit * qty;
              }, 0);
              
              const totalWeeksRecorded = weeklyExpenses?.length || 1;
              const avgWeeklySpend = (weeklyExpenses?.reduce((sum, w) => sum + (w.total_amount || 0), 0) || 0) / totalWeeksRecorded;
              
              const mostExpensive = (groceries || []).reduce((max, item) => {
                const unitPrice = Number(item.cost ?? 0);
                return unitPrice > max.cost ? { name: item.name || "", cost: unitPrice } : max;
              }, { name: "", cost: 0 });
              
              const budgetCompliance = weeklyExpenses?.filter(week => (week.total_amount || 0) <= weeklyBudget).length || 0;
              const totalWeeks = weeklyExpenses?.length || 1;
              
              setStatistics({
                // keep totalSpent available if you still need it elsewhere
                totalSpent,
                // new monthly-specific stat values
                monthlyTotal: monthlyTotal ?? 0,
                currentMonthLabel: currentMonthLabel ?? '',
                averageWeeklySpend: avgWeeklySpend,
                mostExpensiveItem: mostExpensive,
                totalItems: groceries?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0,
                pantryItems: pantryItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
                groceryItems: groceryItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
                expiredItems: expirationGroups.expired,
                expiringThisWeek: expirationGroups.thisWeek + expirationGroups.today,
                averageItemCost: (groceries?.length ?? 0) > 0 ? Math.round(((totalSpent / (groceries.reduce((s, i) => s + (i.quantity || 1), 0) || 1)) + Number.EPSILON) * 100) / 100 : 0,
                budgetCompliance: (budgetCompliance / totalWeeks) * 100,
                weeklyBudget
              });
              // ---- end replacement ----
      
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "This Month",
      value: `$${(statistics.monthlyTotal ?? 0).toFixed(2)}`,
      icon: DollarSign,
      description: statistics.currentMonthLabel ? `Spending for ${statistics.currentMonthLabel}` : "Spending this month",
      trend: null
    },
    {
      title: "Avg. Weekly Spend",
      value: `$${statistics.averageWeeklySpend.toFixed(2)}`,
      icon: TrendingUp,
      description: `Budget: $${statistics.weeklyBudget}`,
      trend: statistics.averageWeeklySpend > statistics.weeklyBudget ? "over" : "under"
    },
    {
      title: "Total Items",
      value: statistics.totalItems,
      icon: Package,
      description: `${statistics.pantryItems} pantry, ${statistics.groceryItems} grocery`,
      trend: null
    },
    {
      title: "Budget Compliance",
      value: `${statistics.budgetCompliance.toFixed(0)}%`,
      icon: Activity,
      description: "Weeks within budget",
      trend: statistics.budgetCompliance >= 70 ? "good" : "poor"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-surface-secondary border-r border-border min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">Dashboard</h2>
            
            <nav className="space-y-2">
              {[
                { name: "Overview", path: "/dashboard", icon: Home },
                { name: "Analytics", path: "/analytics", icon: BarChart3, active: true },
                { name: "Insights", path: "/insights", icon: Activity },
                { name: "Settings", path: "/settings", icon: Settings }
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

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Deep insights into your spending patterns and inventory management
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-4 w-4 ${
                    stat.trend === 'over' || stat.trend === 'poor' ? 'text-red-500' :
                    stat.trend === 'under' || stat.trend === 'good' ? 'text-green-500' :
                    'text-muted-foreground'
                  }`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Weekly Spending Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Spending Trend</CardTitle>
                <CardDescription>
                  Your spending over the last 12 weeks compared to budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklySpending}>
                    <defs>
                      <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="spending" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorSpending)"
                      name="Weekly Spending" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="budget" 
                      stroke="hsl(var(--destructive))" 
                      strokeDasharray="5 5"
                      name="Weekly Budget"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>
                  Distribution between pantry and grocery items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, count }) => `${name}: $${value.toFixed(2)} (${count} items)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--foreground))" />
                    </Pie>
                    <Tooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          {/* Charts Row 2 */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
  {/* Monthly Trends */}
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>Monthly Spending Trends</CardTitle>
      <CardDescription>
        Total spending by month
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={monthlyTrends}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip 
            formatter={(value: any) => `$${Number(value).toFixed(2)}`}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))'
            }}
          />
          <Legend />
          <Line
        type="monotone"
        dataKey="total"
        stroke="hsl(var(--primary))"
        strokeWidth={3}
        dot={{ r: 4 }}
        name="Monthly"
      />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
</div>


          {/* Key Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Most Expensive Item</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">${statistics.mostExpensiveItem.cost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{statistics.mostExpensiveItem.name || "No items yet"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Average Item Cost</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                ${statistics.averageItemCost.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Per item across all categories
              </p>
                          </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    );
  }

