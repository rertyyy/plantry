import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PricingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handlePayPalCheckout = async (planId: string, planType: string) => {
    try {
      setLoadingPlan(planType);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to subscribe to a plan",
          variant: "destructive"
        });
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke('paypal-checkout', {
        body: { planId, planType }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('PayPal checkout error:', error);
      toast({
        title: "Checkout error",
        description: "Failed to initiate checkout. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleGetStarted = (planName: string) => {
    if (planName === "Free") {
      navigate("/");
    } else if (planName === "Pro") {
      handlePayPalCheckout("P-4H3760406Y7285539NDGSL6A", "pro");
    } else if (planName === "Pro Annual") {
      handlePayPalCheckout("P-84U50018700438446NC6F7JA", "pro_annual");
    }
  };

  const plans = [
    {
      name: "Free",
      price: "£0",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "Track up to 20 grocery items",
        "Basic expense tracking",
        "1 AI recipe per week",
        "Basic analytics"
      ],
      highlighted: false
    },
    {
      name: "Pro",
      price: "£4.99",
      period: "/month",
      description: "For serious meal planners",
      features: [
        "Unlimited grocery items",
        "Advanced expense tracking",
        "Unlimited AI recipes",
        "Budget recommendations",
        "Weekly reports",
        "Export data to CSV",
        "Priority support"
      ],
      highlighted: true
    },
    {
      name: "Pro Annual",
      price: "£8.99",
      period: "/month",
      description: "Best value - save £12",
      yearlyPrice: "£107.88/year",
      features: [
        "Everything in Pro",
        "2 months free",
        "Annual billing",
        "Premium analytics",
        "Early access to new features",
        "Dedicated support",
        "Custom budget insights"
      ],
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start tracking your groceries and saving money today. Upgrade anytime as your needs grow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.name}
              className={`relative flex flex-col h-full ${plan.highlighted ? 'border-primary shadow-xl scale-105' : 'border-border'}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                  {plan.yearlyPrice && (
                    <p className="text-sm text-primary mt-1">{plan.yearlyPrice}</p>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="mt-auto pt-6">
                <Button 
                  className={`w-full ${
                    plan.highlighted 
                      ? '' 
                      : 'border border-foreground/20 hover:border-foreground/40'
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={() => handleGetStarted(plan.name)}
                  disabled={loadingPlan === plan.name.toLowerCase().replace(" ", "_")}
                >
                  {loadingPlan === plan.name.toLowerCase().replace(" ", "_") ? "Processing..." : "Get Started"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-2">Can I change my plan later?</h3>
              <p className="text-muted-foreground">Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground">You can start with our Free plan and upgrade when you're ready. Pro and Family plans come with a 14-day money-back guarantee.</p>
            </div>
            <div className="bg-card rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-2">How does AI recipe generation work?</h3>
              <p className="text-muted-foreground">Our AI analyzes your grocery items, dietary preferences, and budget to suggest personalized recipes that minimize waste and maximize savings.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
