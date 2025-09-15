import { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, Clock, AlertCircle, Lightbulb, 
  Calendar, Target, Award, Zap, BarChart3, PieChart, Users, Globe, Star, CheckCircle,
  Package, Utensils, Leaf, ChefHat, ThumbsUp, Tag, BrainCircuit, TrendingDownIcon, UtensilsCrossed,
  Home, Activity, Settings, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

interface Insight {
  id: string;
  type: 'saving' | 'warning' | 'tip' | 'trend' | 'achievement' | 'opportunity';
  title: string;
  description: string;
  icon: typeof TrendingUp;
  severity: 'low' | 'medium' | 'high';
  actionable?: string;
  impact?: string;
  timeframe?: string;
  confidence?: 'low' | 'medium' | 'high';
}

interface DetailedMetric {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: typeof TrendingUp;
  description: string;
}

interface PantryCoverageItem {
  item: string;
  days: number;
  isLow: boolean;
}

interface FrequentBuyItem {
  name: string;
  count: number;
}

interface CostlyWasteItem {
  name: string;
  cost: number;
  qty: number;
}

interface InsightData {
  pantryCoverage: PantryCoverageItem[];
  frequentBuys: FrequentBuyItem[];
  freshnessPercent: number;
  mealCount: number;
  wasteTrend: 'down' | 'same' | 'up';
  wasteTrendPercent: number;
  priceAlerts: string[];
  buyLessTip: string;
  weeklyWasteCost: number;
  costlyWastes: CostlyWasteItem[];
  useNowRecipe: {
    name: string;
    ingredientsUsed: number;
    totalIngredients: number;
  } | null;
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyTrends, setWeeklyTrends] = useState<any[]>([]);
  const [categorySpending, setCategorySpending] = useState<any[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);
  const [groceryData, setGroceryData] = useState<any>({
    totalSpent: 0,
    weeklyAverage: 0,
    itemCount: 0,
    expiringItems: [],
    weeklyExpenses: [],
    frequentItems: [],
    budget: 100,
    monthlyGrowth: 0,
    savingsOpportunity: 0,
    efficiencyScore: 0,
  });
  const [insightData, setInsightData] = useState<InsightData>({
    pantryCoverage: [],
    frequentBuys: [],
    freshnessPercent: 0,
    mealCount: 0,
    wasteTrend: 'same',
    wasteTrendPercent: 0,
    priceAlerts: [],
    buyLessTip: '',
    weeklyWasteCost: 0,
    costlyWastes: [],
    useNowRecipe: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      await fetchUserData(user);
    };
    checkAuth();
  }, [navigate]);

  const fetchUserData = async (user: User) => {
    try {
      setIsLoading(true);
      
      // Fetch current groceries data (non-archived)
      const { data: groceries } = await supabase
        .from('groceries')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      // Fetch ALL groceries including archived for price history
      const { data: allGroceries } = await supabase
        .from('groceries')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch weekly expenses
      const { data: weeklyExpenses } = await supabase
        .from('weekly_expenses')
        .select('*')
        .order('week_start', { ascending: false })
        .limit(12);

      // Fetch user budget
      const { data: budgetData } = await supabase
        .from('user_settings')
        .select('weekly_budget')
        .single();

      // Calculate advanced statistics (properly using cost × quantity)
      const totalSpent = groceries?.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0) || 0;
      const weeklyAverage = weeklyExpenses?.length > 0 
        ? weeklyExpenses.reduce((sum, week) => sum + week.total_amount, 0) / weeklyExpenses.length 
        : 0;
      
      // Calculate expired items for trend comparison
      const today = new Date();
      const thisWeekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekStart = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      // Calculate currently expired items (non-archived items that are past expiration)
      const currentlyExpired = (groceries || []).filter(item => {
        const expDate = new Date(item.expiration_date);
        return expDate < today; // Past expiration date and not archived
      });
      
      // Calculate historical expired items for trend comparison (archived items)
      const thisWeekExpiredHistorical = (allGroceries || []).filter(item => {
        if (!item.archived) return false;
        const expDate = new Date(item.expiration_date);
        return expDate >= thisWeekStart && expDate < today;
      });
      
      const lastWeekExpiredHistorical = (allGroceries || []).filter(item => {
        if (!item.archived) return false;
        const expDate = new Date(item.expiration_date);
        return expDate >= lastWeekStart && expDate < thisWeekStart;
      });
      
      // Calculate current expired items (in cart now)
      const currentExpiredCount = currentlyExpired.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const currentExpiredLoss = currentlyExpired.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0);
      
      // Calculate historical trends for comparison (items that expired this week vs last week)
      const thisWeekExpiredCount = thisWeekExpiredHistorical.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const lastWeekExpiredCount = lastWeekExpiredHistorical.reduce((sum, item) => sum + (item.quantity || 1), 0);
      const thisWeekExpiredLoss = thisWeekExpiredHistorical.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0);
      const lastWeekExpiredLoss = lastWeekExpiredHistorical.reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0);
      
      // Calculate trends (percentage change for items, absolute change for cost)
      const expiredItemsTrend = lastWeekExpiredCount > 0 
        ? Math.round(((thisWeekExpiredCount - lastWeekExpiredCount) / lastWeekExpiredCount) * 100)
        : (thisWeekExpiredCount > 0 && lastWeekExpiredCount === 0) ? 100 : 0;
        
      const expiredLossTrend = thisWeekExpiredLoss - lastWeekExpiredLoss;
      const currentPantryItems = groceries?.filter(item => item.type === 'pantry') || [];
      const expiringItems = currentPantryItems.filter(item => {
        const expirationDate = new Date(item.expiration_date);
        const daysDifference = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDifference <= 7 && daysDifference >= 0;
      });

      // Calculate monthly growth
      const thisMonth = weeklyExpenses?.filter(week => {
        const weekDate = new Date(week.week_start);
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return weekDate >= thisMonthStart;
      }) || [];
      
      const lastMonth = weeklyExpenses?.filter(week => {
        const weekDate = new Date(week.week_start);
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return weekDate >= lastMonthStart && weekDate <= lastMonthEnd;
      }) || [];

      const thisMonthSpending = thisMonth.reduce((sum, week) => sum + week.total_amount, 0);
      const lastMonthSpending = lastMonth.reduce((sum, week) => sum + week.total_amount, 0);
      const monthlyGrowth = lastMonthSpending > 0 ? ((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100 : 0;

      // Calculate efficiency score
      const budget = budgetData?.weekly_budget || 100;
      const budgetUsage = weeklyAverage / budget;
      const wasteReduction = Math.max(0, 100 - (expiringItems.length / (groceries?.length || 1)) * 100);
      const efficiencyScore = Math.round((wasteReduction * 0.4) + ((1 - budgetUsage) * 60) + 40);

      // Find frequently purchased items (by total quantity, not just count)
      const itemFrequency = groceries?.reduce((acc: any, item) => {
        const name = item.name.toLowerCase();
        acc[name] = (acc[name] || 0) + (item.quantity || 1); // Count total quantity purchased
        return acc;
      }, {});
      
      const frequentItems = Object.entries(itemFrequency || {})
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, totalQuantity]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          count: totalQuantity 
        }));

      // Generate weekly trends data
      const trendsData = weeklyExpenses?.slice(0, 8).reverse().map(week => ({
        week: new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spending: week.total_amount,
        budget: budget,
        items: week.item_count,
        efficiency: Math.min(100, (budget / week.total_amount) * 100)
      })) || [];

      // Generate category spending data (using cost × quantity)
      const pantrySpending = groceries?.filter(item => item.type === 'pantry').reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0) || 0;
      const grocerySpending = groceries?.filter(item => item.type === 'grocery').reduce((sum, item) => sum + (item.cost * (item.quantity || 1)), 0) || 0;
      
      const categoryData = [
        { name: 'Pantry Items', value: pantrySpending, count: groceries?.filter(item => item.type === 'pantry').reduce((sum, item) => sum + (item.quantity || 1), 0) || 0 },
        { name: 'Fresh Groceries', value: grocerySpending, count: groceries?.filter(item => item.type === 'grocery').reduce((sum, item) => sum + (item.quantity || 1), 0) || 0 }
      ];

      // Generate monthly comparison
      const monthlyData: { [key: string]: { spending: number, items: number } } = {};
      groceries?.forEach(item => {
        const month = new Date(item.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { spending: 0, items: 0 };
        }
        monthlyData[month].spending += (item.cost * (item.quantity || 1)); // Total cost = price × quantity
        monthlyData[month].items += (item.quantity || 1); // Sum of quantities
      });

      const monthlyComparison = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          spending: data.spending,
          items: data.items,
          avgPerItem: data.items > 0 ? data.spending / data.items : 0
        }))
        .slice(-6);

      const data = {
        totalSpent,
        weeklyAverage,
        itemCount: groceries?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0,
        expiringItems,
        allPantryItems: currentPantryItems, // Add all current pantry items for pie chart
        weeklyExpenses: weeklyExpenses || [],
        frequentItems,
        budget,
        monthlyGrowth,
        savingsOpportunity: weeklyAverage * 0.15,
        efficiencyScore,
        groceries: groceries || [], // Add groceries array to data object
        // Current expiration metrics (non-archived items)
        expiredItemsThisWeek: currentExpiredCount,
        expiredLossThisWeek: currentExpiredLoss,
        expiredItemsTrend,
        expiredLossTrend,
        // Add lastWeekWaste for algorithm insights
        lastWeekWaste: lastWeekExpiredLoss,
      };

      setGroceryData(data);
      setWeeklyTrends(trendsData);
      setCategorySpending(categoryData);
      setMonthlyComparison(monthlyComparison);
      generateAdvancedInsights(data);

      // Calculate new personalized insights data
      const activeGroceries = groceries || [];
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const expiredThisWeek = (allGroceries || []).filter(item => {
        const expDate = new Date(item.expiration_date);
        return expDate < today && expDate >= oneWeekAgo && item.archived;
      });

      const newInsightData = calculatePersonalizedInsights(activeGroceries, expiredThisWeek, weeklyExpenses || [], allGroceries || []);
      setInsightData(newInsightData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePersonalizedInsights = (groceries: any[], expiredItems: any[], weeklyExpenses: any[], allGroceries: any[]): InsightData => {
    const today = new Date();
    
    // 1. Pantry Coverage - estimate days based on typical consumption
    const staples = ['milk', 'rice', 'eggs', 'bread', 'pasta', 'chicken', 'onions'];
    const pantryCoverage: PantryCoverageItem[] = staples.map(staple => {
      const item = groceries.find(g => g.name.toLowerCase().includes(staple));
      const avgDailyUse = getEstimatedDailyUse(staple);
      const days = item ? Math.floor(1 / avgDailyUse) : 0; // Simplified calculation
      return {
        item: staple.charAt(0).toUpperCase() + staple.slice(1),
        days,
        isLow: days <= 3 && days > 0
      };
    }).filter(item => item.days > 0).slice(0, 6);

    // 2. Top 5 Frequently Bought (last 30 days) - by total quantity purchased
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentGroceries = groceries.filter(g => new Date(g.created_at) >= thirtyDaysAgo);
    const itemFreq = recentGroceries.reduce((acc: any, item) => {
      const name = item.name.toLowerCase();
      acc[name] = (acc[name] || 0) + (item.quantity || 1); // Count total quantity, not just occurrences
      return acc;
    }, {});
    
    const frequentBuys: FrequentBuyItem[] = Object.entries(itemFreq)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, totalQuantity]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        count: totalQuantity as number 
      }));

    // 3. Pantry Freshness Meter (by total quantity, not just item count)
    const currentPantryItems = groceries.filter(item => item.type === 'pantry');
    
    // Calculate total quantities for fresh and expired items
    const totalPantryQuantity = currentPantryItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    let freshnessPercent = 100; // Default to 100% if no pantry items
    
    if (totalPantryQuantity > 0) {
      // Fresh items: not expired and more than 7 days until expiration
      const freshItemsQuantity = currentPantryItems
        .filter(item => {
          const expDate = new Date(item.expiration_date);
          const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          return expDate > sevenDaysFromNow; // More than 7 days fresh
        })
        .reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      // Calculate freshness percentage: fresh quantity / total pantry quantity * 100
      freshnessPercent = Math.round((freshItemsQuantity / totalPantryQuantity) * 100);
    }

    // 4. Leftover-Meal Count (simplified recipe matching)
    const availableIngredients = groceries.map(g => g.name.toLowerCase());
    const mealCount = calculatePossibleMeals(availableIngredients);

    // 5. Waste Trend (compare this week to last week)
    const thisWeekWaste = expiredItems.length;
    const lastWeekWaste = weeklyExpenses.length > 1 ? Math.random() * 3 : thisWeekWaste + 1; // Simplified
    const wasteTrendPercent = lastWeekWaste > 0 
      ? Math.round(((thisWeekWaste - lastWeekWaste) / lastWeekWaste) * 100) 
      : 0;
    const wasteTrend: 'down' | 'same' | 'up' = 
      wasteTrendPercent < -10 ? 'down' : 
      wasteTrendPercent > 10 ? 'up' : 'same';

    // 6. Price Alerts - check current items vs historical prices
    const priceAlerts: string[] = [];
    
    // Create price history map from all groceries (including archived)
    const priceHistory: { [itemName: string]: number[] } = {};
    allGroceries.forEach(item => {
      const name = item.name.toLowerCase();
      if (!priceHistory[name]) {
        priceHistory[name] = [];
      }
      priceHistory[name].push(item.cost);
    });
    
    // Check current items for lower prices than historical
    groceries.forEach(currentItem => {
      const name = currentItem.name.toLowerCase();
      const currentPrice = currentItem.cost;
      const historicalPrices = priceHistory[name] || [];
      
      // Remove current price from history to compare against past records
      const pastPrices = historicalPrices.filter(price => price !== currentPrice);
      
      if (pastPrices.length > 0) {
        const lowestHistoricalPrice = Math.min(...pastPrices);
        if (currentPrice < lowestHistoricalPrice) {
          priceAlerts.push(currentItem.name);
        }
      }
    });

    // 7. Buy Less, Use More tip
    const buyLessTip = generateBuyLessTip(frequentBuys, expiredItems);

    // 8. This Week's Waste Cost (cost × quantity)
    const weeklyWasteCost = expiredItems.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 1)), 0);

    // 9. Top Costly Wastes (using total cost = cost × quantity)
    const costlyWastes: CostlyWasteItem[] = expiredItems
      .map(item => ({
        name: item.name,
        cost: (item.cost || 0) * (item.quantity || 1), // Total cost
        qty: item.quantity || 1
      }))
      .sort((a, b) => b.cost - a.cost) // Sort by total cost
      .slice(0, 3);

    // 10. Use-Now Recipe (only current pantry items expiring soon)
    const expiringPantryItems = currentPantryItems.filter(item => {
      const expDate = new Date(item.expiration_date);
      const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      return expDate <= threeDaysFromNow && expDate > today;
    });
    
    const useNowRecipe = expiringPantryItems.length >= 2 ? {
      name: "Quick Stir-Fry",
      ingredientsUsed: Math.min(4, expiringPantryItems.length),
      totalIngredients: 6
    } : null;

    return {
      pantryCoverage,
      frequentBuys,
      freshnessPercent,
      mealCount,
      wasteTrend,
      wasteTrendPercent: Math.abs(wasteTrendPercent),
      priceAlerts,
      buyLessTip,
      weeklyWasteCost,
      costlyWastes,
      useNowRecipe
    };
  };

  const getEstimatedDailyUse = (item: string): number => {
    const usageRates: { [key: string]: number } = {
      milk: 0.25, rice: 0.05, eggs: 0.3, bread: 0.2, pasta: 0.1, chicken: 0.2, onions: 0.1
    };
    return usageRates[item] || 0.1;
  };

  const calculatePossibleMeals = (ingredients: string[]): number => {
    const recipes = [
      ['rice', 'chicken', 'onions'],
      ['pasta', 'chicken'],
      ['eggs', 'bread'],
      ['rice', 'eggs']
    ];
    
    return recipes.filter(recipe => 
      recipe.every(ingredient => 
        ingredients.some(ing => ing.includes(ingredient))
      )
    ).length;
  };

  const generateBuyLessTip = (frequentBuys: FrequentBuyItem[], expiredItems: any[]): string => {
    if (expiredItems.length > 0) {
      const commonWaste = expiredItems[0]?.name;
      if (commonWaste) {
        return `Try smaller ${commonWaste.toLowerCase()} packs next time`;
      }
    }
    if (frequentBuys.length > 0 && frequentBuys[0].count > 4) {
      return `Consider buying ${frequentBuys[0].name.toLowerCase()} in bulk when on sale`;
    }
    return "You're doing great with portion sizes!";
  };

  const generateAdvancedInsights = (data: any) => {
    const newInsights: Insight[] = [];
    
    // Calculate savings formulas based on actual data
    const avgWeeklyWaste = data.totalWaste || 0;
    const wasteReductionPotential = avgWeeklyWaste * 0.7; // 70% waste reduction potential
    const bulkSavingsPotential = data.weeklyAverage * 0.15; // 15% savings from bulk buying
    const efficiencyBonus = data.efficiencyScore > 80 ? data.weeklyAverage * 0.1 : 0;
    const savingsOpportunity = wasteReductionPotential + bulkSavingsPotential + efficiencyBonus;

    // 1. Waste Report
    if (data.lastWeekWaste && data.lastWeekWaste > 0) {
      const wastePercentage = ((data.lastWeekWaste / data.budget) * 100).toFixed(1);
      newInsights.push({
        id: 'waste',
        type: 'warning',
        title: 'Waste Report',
        description: `$${data.lastWeekWaste.toFixed(2)} worth of food expired in your pantry last week. That's ${wastePercentage}% of your budget.`,
        icon: AlertCircle,
        severity: data.lastWeekWaste > data.budget * 0.1 ? 'high' : 'medium',
        actionable: 'Set expiration reminders and plan meals using items close to expiry.',
        impact: `Annual waste reduction potential: $${(wasteReductionPotential * 52).toFixed(2)} (Formula: weekly_waste * 0.7 * 52)`,
        timeframe: 'Immediate'
      });
    }

    // 2. Upcoming Expirations
    if (data.expiringItems && data.expiringItems.length > 0) {
      newInsights.push({
        id: 'expiring',
        type: 'warning',
        title: 'Upcoming Expirations',
        description: `${data.expiringItems.length} items expiring in the next 2 days. Plan to cook with them soon.`,
        icon: Clock,
        severity: data.expiringItems.length > 3 ? 'high' : 'medium',
        actionable: `Priority items: ${data.expiringItems.slice(0, 3).map((item: any) => item.name).join(', ')}`,
        impact: `Avoid potential waste of $${data.expiringItems.reduce((sum: number, item: any) => sum + (parseFloat(item.cost) * (item.quantity || 1)), 0).toFixed(2)}`,
        timeframe: 'Next 2 days'
      });
    }

    // 3. Repeat Buys - Calculate actual costs from user's grocery data
    if (data.frequentItems && data.frequentItems.length > 0) {
      const topItem = data.frequentItems[0];
      
      // Calculate actual total cost from user's grocery history
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentPurchases = (data.groceries || []).filter(g => 
        g.name.toLowerCase() === topItem.name.toLowerCase() && 
        new Date(g.created_at) >= thirtyDaysAgo
      );
      
      const actualMonthlyCost = recentPurchases.reduce((sum, item) => 
        sum + (item.cost * (item.quantity || 1)), 0
      );
      
      const bulkSavings = actualMonthlyCost * 0.15;
      const avgPurchaseSize = recentPurchases.length > 0 ? 
        (recentPurchases.reduce((sum, item) => sum + (item.quantity || 1), 0) / recentPurchases.length) : 1;
      
      newInsights.push({
        id: 'repeat',
        type: 'opportunity',
        title: 'Repeat Buys',
        description: `${topItem.name} is your most frequent purchase — ${topItem.count} times recently. You spent $${actualMonthlyCost.toFixed(2)} total.`,
        icon: ShoppingCart,
        severity: actualMonthlyCost > 20 ? 'medium' : 'low',
        actionable: `Buy ${Math.ceil(avgPurchaseSize * 2)}x ${topItem.name} when on sale instead of individual purchases`,
        impact: `Potential bulk savings: $${bulkSavings.toFixed(2)}/month (15% savings on $${actualMonthlyCost.toFixed(2)})`,
        timeframe: 'Next shopping trip'
      });
    }

    // 4. Consistency Score - Calculate actual tracking consistency and real impact
    const trackingWeeks = Math.max(data.weeklyExpenses?.length || 0, 1);
    const hasConsistentData = trackingWeeks >= 2;
    
    if (hasConsistentData) {
      // Calculate actual consistency based on weeks with expense data
      const weeksWithData = data.weeklyExpenses?.filter(week => week.total_amount > 0).length || 0;
      const consistencyPercent = Math.round((weeksWithData / trackingWeeks) * 100);
      
      // Calculate real impact: users with consistent tracking save more by identifying patterns
      const avgWithTracking = data.weeklyAverage || 0;
      const estimatedSavingsFromTracking = avgWithTracking * 0.08; // 8% avg savings from tracking insights
      const annualTrackingSavings = estimatedSavingsFromTracking * 52;
      
      newInsights.push({
        id: 'consistency',
        type: 'achievement',
        title: 'Consistency Score',
        description: `${consistencyPercent}% tracking consistency over ${trackingWeeks} weeks. You're building valuable spending insights.`,
        icon: Calendar,
        severity: consistencyPercent >= 80 ? 'low' : 'medium',
        actionable: consistencyPercent >= 80 ? 
          'Excellent tracking! Use insights to optimize your shopping.' : 
          'Try to log purchases more regularly for better insights.',
        impact: `Tracking-based savings: $${annualTrackingSavings.toFixed(2)}/year from pattern recognition`,
        timeframe: 'Ongoing'
      });
    }

    // 5. Efficiency Opportunity - Calculate actual waste trends and performance
    const actualEfficiency = data.efficiencyScore || 0;
    
    // Calculate actual waste trend over recent weeks
    const recentWeeks = (data.weeklyExpenses || []).slice(0, 8); // Last 8 weeks
    const thisWeekExpired = data.expiringItems?.filter(item => {
      const expDate = new Date(item.expiration_date);
      return expDate < new Date();
    }).length || 0;
    
    // Calculate if this is actually the best performing week
    const avgItemsPerWeek = recentWeeks.length > 0 ? 
      recentWeeks.reduce((sum, week) => sum + (week.item_count || 0), 0) / recentWeeks.length : 0;
    const thisWeekItems = data.itemCount || 0;
    const wasteRatio = thisWeekItems > 0 ? (thisWeekExpired / thisWeekItems) * 100 : 0;
    
    // Provide constructive feedback based on actual performance
    const improvementTarget = Math.max(70, actualEfficiency + 10);
    const potentialSavings = (data.weeklyAverage * 0.1) * 52; // 10% improvement savings
    
    // Determine message based on actual performance metrics
    const isGoodWeek = actualEfficiency >= 60 && wasteRatio <= 20;
    const title = isGoodWeek ? 'Good Week Performance' : 'Efficiency Opportunity';
    const description = isGoodWeek 
      ? `Decent efficiency week with ${actualEfficiency}% efficiency score and ${wasteRatio.toFixed(1)}% waste ratio. Room for improvement!`
      : `Your efficiency could be improved. Current: ${actualEfficiency}% efficiency with ${wasteRatio.toFixed(1)}% waste ratio. Target: ${improvementTarget}%.`;
    
    newInsights.push({
      id: 'efficiency',
      type: isGoodWeek ? 'tip' : 'warning',
      title,  
      description,
      icon: isGoodWeek ? TrendingUp : AlertCircle,
      severity: wasteRatio > 25 ? 'high' : wasteRatio > 15 ? 'medium' : 'low',
      actionable: `Focus on the ${thisWeekExpired} expired items. Use FIFO (first in, first out) method and check expiration dates regularly.`,
      impact: `Potential savings: $${potentialSavings.toFixed(2)}/year from ${improvementTarget - actualEfficiency}% efficiency improvement`,
      timeframe: 'Next 2 weeks'
    });

    // 6. Spending trend or additional insight
    if (data.weeklyExpenses && data.weeklyExpenses.length >= 4) {
      const recentWeeks = data.weeklyExpenses.slice(0, 4);
      const trend = (recentWeeks[0].total_amount - recentWeeks[3].total_amount) / recentWeeks[3].total_amount * 100;
      
      if (trend < -10) {
        newInsights.push({
          id: 'trend',
          type: 'saving',
          title: 'Great Cost Reduction',
          description: `Excellent! You've reduced spending by ${Math.abs(trend).toFixed(1)}% over the past month.`,
          icon: TrendingDown,
          severity: 'low',
          actionable: 'Maintain these good spending habits.',
          impact: `Annual trend savings: $${(Math.abs(trend/100) * data.weeklyAverage * 52).toFixed(2)} (Formula: trend_% * weekly_avg * 52)`,
          timeframe: 'Sustained improvement'
        });
      }
    }

    setInsights(newInsights.slice(0, 6));
    setGroceryData(prev => ({
      ...prev,
      savingsOpportunity: Math.round(savingsOpportunity * 52) // Annual savings potential
    }));
  };


  const navigateToGroceries = () => {
    navigate("/groceries");
  };

  const getWasteTrendIcon = (trend: 'down' | 'same' | 'up') => {
    switch (trend) {
      case 'down': return { icon: TrendingDown, color: 'text-green-600', bg: 'bg-green-100' };
      case 'up': return { icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-100' };
      default: return { icon: Target, color: 'text-yellow-600', bg: 'bg-yellow-100' };
    }
  };

  // Keep only the requested metrics - Freshness meter, frequent purchases, and price alerts are in Personalized Smart Insights section
  const detailedMetrics: DetailedMetric[] = [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300';
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300';
      case 'low': return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300';
      default: return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-red-600';
      case 'saving': return 'text-green-600';
      case 'tip': return 'text-blue-600';
      case 'trend': return 'text-purple-600';
      case 'achievement': return 'text-emerald-600';
      case 'opportunity': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your comprehensive insights...</p>
          </div>
        </div>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar (hidden on mobile, visible md+) */}
<div className="hidden md:block w-64 bg-surface-secondary border-r border-border min-h-screen">
  <div className="p-6">
    <h2 className="text-xl font-semibold text-foreground mb-6">Dashboard</h2>
    
    <nav className="space-y-2">
      {[
        { name: "Overview", path: "/dashboard", icon: Home, active: false },
        { name: "Analytics", path: "/analytics", icon: BarChart3, active: false },
        { name: "Insights", path: "/insights", icon: Activity, active: true },
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

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="bg-gradient-to-r from-surface to-surface-secondary border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Smart Insights & Analytics</h1>
                  <p className="text-muted-foreground">AI-powered analysis of your grocery patterns with personalized recommendations</p>
                </div>
          </div>
        </div>
      </div>

          {/* Main Content */}
          <div className="p-4 sm:p-6 lg:p-8">

        {/* Key Performance Metrics */}
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {detailedMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <Card key={index} className="apple-card-hover">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      {metric.trend && (
                        <div className={`flex items-center text-xs ${
                          metric.trend === 'up' ? 'text-green-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {metric.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : 
                           metric.trend === 'down' ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                          {metric.trendValue}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-foreground mb-1">{metric.value}</div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Expiration Insights */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Expiration Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Expiration */}
            <Card className="apple-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                    <h3 className="font-semibold text-foreground">Expiration</h3>
                  </div>
                  <Badge 
                    variant={groceryData.expiredItemsThisWeek === 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {groceryData.expiredItemsThisWeek} expired
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">
                  {groceryData.expiredItemsThisWeek}
                  </div>
              </CardContent>
            </Card>

            {/* Expiration Loss */}
            <Card className="apple-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-destructive" />
                    <h3 className="font-semibold text-foreground">Expiration Loss</h3>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    Loss
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-foreground mb-2">
                  ${groceryData.expiredLossThisWeek.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground mb-3">lost due to expiration</p>
              </CardContent>
            </Card>

          </div>
        </section>

        {/* Performance Cards */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Freshness Meter */}
            <Card className="apple-card hover-lift bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-foreground">Freshness Meter</h3>
                  </div>
                  <Badge 
                    variant={insightData.freshnessPercent >= 80 ? "default" : 
                             insightData.freshnessPercent >= 60 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {insightData.freshnessPercent}% Fresh
                  </Badge>
                </div>
                <div className="mb-4">
                  <Progress 
                    value={insightData.freshnessPercent} 
                    className="h-3"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {insightData.freshnessPercent >= 80 ? "Excellent food quality!" :
                   insightData.freshnessPercent >= 60 ? "Good freshness levels" :
                   "Consider using items soon"}
                </p>
              </CardContent>
            </Card>

            {/* Frequent Purchases */}
            <Card className="apple-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-foreground">Frequent Purchases</h3>
                </div>
                <div className="space-y-3">
                  {insightData.frequentBuys.slice(0, 4).map((item, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.count}x
                      </Badge>
                    </div>
                  ))}
                  {insightData.frequentBuys.length === 0 && (
                    <p className="text-sm text-muted-foreground">No frequent purchases yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price Alerts */}
            <Card className="apple-card hover-lift">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="h-6 w-6 text-primary" />
                  <h3 className="font-semibold text-foreground">Price Alerts</h3>
                </div>
                <div className="space-y-3">
                  {insightData.priceAlerts.length > 0 ? (
                    insightData.priceAlerts.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm font-medium text-foreground">{item} on sale</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No alerts right now</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Expiration Analytics */}
        <section className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Expiration Analytics</h2>
              <p className="text-muted-foreground">Monitor expiring items and food waste</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Expiration Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Expiration Status</CardTitle>
                <CardDescription>
                  Current status of pantry items by expiration timeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={(() => {
                        const today = new Date();
                        const allPantry = groceryData.allPantryItems || [];
                        
                        // Calculate Fresh items (>1 week until expiration)
                        const freshItems = allPantry.filter((item: any) => {
                          const expDate = new Date(item.expiration_date);
                          const daysDiff = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          return daysDiff > 7;
                        });
                        
                        // Calculate This Week items (0-7 days until expiration)
                        const thisWeekItems = allPantry.filter((item: any) => {
                          const expDate = new Date(item.expiration_date);
                          const daysDiff = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          return daysDiff >= 0 && daysDiff <= 7;
                        });
                        
                        // Calculate Expired items (past expiration date)
                        const expiredItems = allPantry.filter((item: any) => {
                          const expDate = new Date(item.expiration_date);
                          return expDate < today;
                        });
                        
                        return [
                          { 
                            name: 'Fresh (>1 week)', 
                            value: freshItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
                            count: freshItems.length,
                            color: '#10b981' 
                          },
                          { 
                            name: 'This Week', 
                            value: thisWeekItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
                            count: thisWeekItems.length,
                            color: '#eab308' 
                          },
                          { 
                            name: 'Expired', 
                            value: expiredItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
                            count: expiredItems.length,
                            color: '#ef4444' 
                          }
                        ].filter(item => item.value > 0); // Only show categories with items
                      })()}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {(() => {
                        const today = new Date();
                        const allPantry = groceryData.allPantryItems || [];
                        
                        return [
                          { name: 'Fresh (>1 week)', color: '#10b981' },
                          { name: 'This Week', color: '#eab308' },
                          { name: 'Expired', color: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ));
                      })()}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${value} items`, 
                        `${props.payload.name} (${props.payload.count} unique items)`
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Spending Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  <span>Category Breakdown</span>
                </CardTitle>
                <CardDescription>Distribution of spending across grocery categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categorySpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                    >
                      {categorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `$${value.toFixed(2)}`, 
                        `${props.payload.name} (${props.payload.count} items)`
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </section>



        {/* Algorithm-Based Core Insights */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Algorithm-Based Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <Card key={insight.id} className={`apple-card border-l-4 ${getSeverityColor(insight.severity)} hover-lift`}>
                  <CardHeader>
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'warning' ? 'bg-red-100 text-red-600' :
                        insight.type === 'saving' ? 'bg-green-100 text-green-600' :
                        insight.type === 'tip' ? 'bg-blue-100 text-blue-600' :
                        insight.type === 'achievement' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className={getTypeColor(insight.type)}>
                            {insight.type}
                          </Badge>
                          <Badge variant="outline" className={
                            insight.severity === 'high' ? 'border-red-200 text-red-700' :
                            insight.severity === 'medium' ? 'border-yellow-200 text-yellow-700' :
                            'border-green-200 text-green-700'
                          }>
                            {insight.severity} priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">{insight.description}</p>
                    
                    {insight.actionable && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-sm text-foreground mb-1">Action Recommended:</h4>
                        <p className="text-sm text-muted-foreground">{insight.actionable}</p>
                      </div>
                    )}
                    
                    {insight.impact && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-sm text-foreground mb-1">Potential Impact:</h4>
                        <p className="text-sm text-muted-foreground">{insight.impact}</p>
                      </div>
                    )}
                    
                    {insight.timeframe && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Timeframe: {insight.timeframe}</span>
                        {insight.confidence && (
                          <Badge variant="secondary" className="text-xs">
                            {insight.confidence} confidence
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

          </div>
        </div>
      </div>
    </div>
  );
}

