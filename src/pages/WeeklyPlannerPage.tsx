import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function WeeklyPlannerPage() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const meals = ["Breakfast", "Lunch", "Dinner", "Dessert"];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Weekly Meal Planner</h1>
        </div>
        <p className="text-muted-foreground">Plan your meals for the week ahead</p>
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
                    {days.map((day, dayIndex) => (
                      <td key={`${meal}-${day}`} className="p-4 border-r border-border last:border-r-0">
                        <div className="min-h-[80px] w-full">
                          <textarea
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

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Quick Fill</h3>
            <p className="text-sm text-muted-foreground">Auto-populate meals based on your preferences</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Save Template</h3>
            <p className="text-sm text-muted-foreground">Save this week's plan as a reusable template</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Shopping List</h3>
            <p className="text-sm text-muted-foreground">Generate shopping list from your meal plan</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
