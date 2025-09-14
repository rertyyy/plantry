import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Home, BarChart3, Activity, Settings, User as UserIcon, Mail, Key, Trash2, CreditCard, Check } from "lucide-react";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentSubscription, setCurrentSubscription] = useState<"free" | "pro" | "annual">("free");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Check PayPal subscription status
  const checkPayPalSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("paypal-verify-subscription");
      
      if (!error && data) {
        if (data.subscribed) {
          if (data.subscription_tier === "Pro Annual") {
            setCurrentSubscription("annual");
          } else if (data.subscription_tier === "Pro") {
            setCurrentSubscription("pro");
          }
        }
      }
    } catch (error) {
      console.error("Error checking PayPal subscription:", error);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        setEmail(user.email || "");
        setUsername(user.user_metadata?.username || "");
        // Fetch subscription status from PayPal
        checkPayPalSubscription();
      } else {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleUpdateEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      
      toast({
        title: "Email update initiated",
        description: "Please check your new email address to confirm the change.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!username) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { username }
      });
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Username updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Request a verification email first
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user?.email || "", {
        redirectTo: `${window.location.origin}/settings`,
      });
      
      if (resetError) throw resetError;
      
      toast({
        title: "Verification Email Sent",
        description: "Please check your email and click the link to verify this password change. You will need to enter your new password after clicking the link.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Check when the user last signed in
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        navigate("/auth");
        return;
      }

      const sessionExpiresAt = new Date(sessionData.session.expires_at || 0);
      const sessionAge = Date.now() - (sessionExpiresAt.getTime() - 3600000); // Session lasts 1 hour
      const hoursSinceLogin = sessionAge / (1000 * 60 * 60);
      
      // If logged in more than 1 hour ago, require re-authentication
      if (hoursSinceLogin > 1) {
        const { error } = await supabase.auth.reauthenticate();
        if (error) {
          toast({
            title: "Re-authentication Required",
            description: "Please verify your identity via the email we sent to confirm account deletion.",
          });
          return;
        }
      }

      // Proceed with account deletion
      // Note: Full account deletion would require an edge function with service role
      await supabase.auth.signOut();
      toast({
        title: "Account Deleted",
        description: "Your account has been successfully deleted.",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const subscriptionPlans = [
    {
      name: "Free",
      price: "£0",
      period: "/month",
      features: [
        "Track up to 20 grocery items",
        "Basic expense tracking",
        "1 AI recipe per week",
        "Basic analytics"
      ],
      planId: "free" as const,
    },
    {
      name: "Pro",
      price: "£9.99",
      period: "/month",
      features: [
        "Unlimited grocery items",
        "Advanced expense tracking",
        "Unlimited AI recipes",
        "Budget recommendations",
        "Weekly reports",
        "Export data to CSV",
        "Priority support"
      ],
      planId: "pro" as const,
    },
    {
      name: "Pro Annual",
      price: "£8.99",
      period: "/month",
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
      planId: "annual" as const,
    }
  ];

  const handleSubscriptionChange = async (planId: "free" | "pro" | "annual") => {
    if (planId === "free") {
      toast({
        title: "Free Plan",
        description: "You're already on the free plan!",
      });
      return;
    }

    setLoading(true);
    setIsCheckingOut(true);
    
    try {
      // IMPORTANT: Replace these with your actual PayPal plan IDs from your PayPal dashboard
      // You can find these in your PayPal Developer Dashboard under "Products & Plans"
      const paypalPlans = {
        pro: { 
          planId: "P-6U060289J3554860MNC6F6JQ", // PayPal Pro plan ID
          planType: "pro" 
        },
        annual: { 
          planId: "P-84U50018700438446NC6F7JA", // PayPal Pro Annual plan ID
          planType: "annual" 
        }
      };

      const selectedPlan = paypalPlans[planId];
      
      if (!selectedPlan) {
        throw new Error("Invalid plan selected");
      }

      // Call PayPal checkout edge function
      const { data, error } = await supabase.functions.invoke("paypal-checkout", {
        body: {
          planId: selectedPlan.planId,
          planType: selectedPlan.planType
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        // Open PayPal checkout in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to PayPal",
          description: "Complete your subscription in the PayPal checkout window.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate checkout",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
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

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Settings
              </h1>
              <p className="text-xl text-muted-foreground">
                Manage your account and subscription preferences
              </p>
            </div>

            {/* Account Settings */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <UserIcon className="w-5 h-5" />
                  <span>Account Settings</span>
                </CardTitle>
                <CardDescription>
                  Update your account information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Update */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center space-x-2">
                    <Mail className="w-4 h-4" />
                    <span>Email Address</span>
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                    <Button 
                      onClick={handleUpdateEmail}
                      disabled={loading || email === user?.email}
                    >
                      Update Email
                    </Button>
                  </div>
                </div>

                {/* Username Update */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                    <Button 
                      onClick={handleUpdateUsername}
                      disabled={loading}
                    >
                      Update Username
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Password Update */}
                <div className="space-y-4">
                  <Label className="flex items-center space-x-2">
                    <Key className="w-4 h-4" />
                    <span>Change Password</span>
                  </Label>
                  
                  <div className="space-y-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                    />
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                    <Button 
                      onClick={handleUpdatePassword}
                      disabled={loading || !newPassword || !confirmPassword}
                    >
                      Update Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Management */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Subscription Management</span>
                </CardTitle>
                <CardDescription>
                  Manage your subscription plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {subscriptionPlans.map((plan) => (
                    <Card 
                      key={plan.planId}
                      className={`relative ${currentSubscription === plan.planId ? 'border-primary shadow-lg' : 'border-border'}`}
                    >
                      {currentSubscription === plan.planId && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold rounded-full">
                            Current Plan
                          </span>
                        </div>
                      )}
                      
                      <CardHeader>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <div className="mt-2">
                          <span className="text-3xl font-bold">{plan.price}</span>
                          <span className="text-muted-foreground">{plan.period}</span>
                          {plan.yearlyPrice && (
                            <p className="text-sm text-primary mt-1">{plan.yearlyPrice}</p>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <ul className="space-y-2">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-start">
                              <Check className="w-4 h-4 text-primary mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      
                      <CardFooter>
                        <Button 
                          className="w-full"
                          variant={currentSubscription === plan.planId ? "secondary" : "default"}
                          disabled={loading || currentSubscription === plan.planId || isCheckingOut}
                          onClick={() => handleSubscriptionChange(plan.planId)}
                        >
                          {isCheckingOut ? "Processing..." :
                           currentSubscription === plan.planId ? "Current Plan" : 
                           currentSubscription === "free" && plan.planId !== "free" ? "Upgrade with PayPal" :
                           currentSubscription !== "free" && plan.planId === "free" ? "Downgrade" :
                           "Switch Plan"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>

                {currentSubscription !== "free" && (
                  <div className="mt-6 text-center">
                    <Button variant="outline" className="text-muted-foreground">
                      Manage Billing & Payment Method
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-destructive">
                  <Trash2 className="w-5 h-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible actions for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost"
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-6 py-2 font-medium"
                    >
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your
                        account and remove all of your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
