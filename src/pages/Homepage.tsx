import { Link } from "react-router-dom";
import { ShoppingCart, Calendar, TrendingDown, BarChart, Smartphone, Brain, Shield, Globe, ArrowRight, CheckCircle, Star, Users, Zap, Target, Cpu, Database, Lock, Cloud, Timer, Wifi, Battery, Layers, Award, TrendingUp, DollarSign, Activity, PlayCircle } from "lucide-react";
import spendingChartHero from "@/assets/spending-chart-hero.jpg";
import freshGroceries from "@/assets/fresh-groceries.jpg";
import analyticsDashboard from "@/assets/analytics-dashboard.jpg";
export default function Homepage() {
  const mainFeatures = [{
    icon: ShoppingCart,
    title: "Inventory Management",
    subtitle: "Real-time tracking",
    description: "Monitor expiring and expired items with prices and quantities. Features sleek item addition, drag-and-drop between grocery and pantry lists, plus autofill for previously added food items.",
    specs: ["Expiration alerts", "Price & quantity tracking", "Drag & drop interface", "Smart autofill"]
  }, {
    icon: Brain,
    title: "AI Engine",
    subtitle: "Machine learning core",
    description: "Neural networks analyze consumption patterns, predict needs, and optimize purchasing decisions with 94% accuracy.",
    specs: ["Pattern recognition", "Predictive modeling", "Smart recommendations", "Behavioral analysis"]
  }, {
    icon: BarChart,
    title: "Analytics Suite",
    subtitle: "Data visualization",
    description: "Comprehensive reporting with real-time charts, spending analysis, and waste reduction metrics across multiple timeframes.",
    specs: ["Real-time charts", "Custom reports", "Export capabilities", "Historical tracking"]
  }, {
    icon: Target,
    title: "Budget Engine",
    subtitle: "Financial optimization",
    description: "Intelligent budget allocation with automated alerts, spending forecasts, and savings recommendations.",
    specs: ["Budget tracking", "Spending forecasts", "Alert system", "Savings analysis"]
  }];
  const technicalSpecs = [{
    category: "Performance",
    specs: [{
      label: "Data Processing",
      value: "< 50ms response time"
    }, {
      label: "Sync Speed",
      value: "Real-time across devices"
    }, {
      label: "Offline Mode",
      value: "Full functionality"
    }, {
      label: "Storage",
      value: "Unlimited cloud storage"
    }]
  }, {
    category: "Intelligence",
    specs: [{
      label: "AI Accuracy",
      value: "94% prediction rate"
    }, {
      label: "Recognition",
      value: "10M+ product database"
    }, {
      label: "Learning",
      value: "Adaptive algorithms"
    }, {
      label: "Processing",
      value: "Edge computing"
    }]
  }, {
    category: "Security",
    specs: [{
      label: "Encryption",
      value: "AES-256 end-to-end"
    }, {
      label: "Authentication",
      value: "OAuth 2.0 + SSO"
    }, {
      label: "Privacy",
      value: "Zero data sharing"
    }, {
      label: "Compliance",
      value: "GDPR + CCPA certified"
    }]
  }];
  const stats = [{
    value: "89%",
    label: "Waste Reduction",
    icon: TrendingDown
  }, {
    value: "150+",
    label: "Countries",
    icon: Globe
  }, {
    value: "99.9%",
    label: "Uptime",
    icon: Activity
  }];
  const testimonials = [{
    name: "Sarah Chen",
    role: "Family of 4",
    content: "This app completely transformed our grocery management. We've reduced waste by 60% and our monthly savings average $180.",
    rating: 5,
    avatar: "SC"
  }, {
    name: "Marcus Rodriguez",
    role: "Nutrition Coach",
    content: "The AI-powered insights are remarkably accurate. My clients appreciate the detailed nutrition tracking and budget optimization features.",
    rating: 5,
    avatar: "MR"
  }, {
    name: "Emily Watson",
    role: "Working Professional",
    content: "Smart notifications and predictive shopping lists save me hours every week. The interface is beautifully designed and intuitive.",
    rating: 5,
    avatar: "EW"
  }];
  const capabilities = [{
    icon: Cpu,
    title: "Neural Processing Unit",
    description: "Custom AI chip delivers 40% faster processing",
    detail: "Dedicated machine learning accelerator optimizes pattern recognition and predictive analytics with minimal battery impact."
  }, {
    icon: Database,
    title: "Advanced Data Architecture",
    description: "Distributed database with 99.9% uptime guarantee",
    detail: "Multi-region cloud infrastructure ensures your data is always available with automatic failover and real-time synchronization."
  }, {
    icon: Lock,
    title: "Enterprise Security",
    description: "Bank-level encryption with biometric authentication",
    detail: "AES-256 encryption, zero-knowledge architecture, and advanced threat detection protect your personal information."
  }, {
    icon: Layers,
    title: "Modular Framework",
    description: "Extensible platform built for future innovations",
    detail: "Component-based architecture allows seamless integration of new features without affecting existing functionality."
  }];
  const awards = [{
    name: "Best App Design",
    year: "2024",
    organization: "Design Awards"
  }, {
    name: "Innovation in AI",
    year: "2024",
    organization: "Tech Excellence"
  }, {
    name: "Sustainability Leader",
    year: "2023",
    organization: "Green Tech Awards"
  }, {
    name: "Consumer Choice",
    year: "2023",
    organization: "App Store Awards"
  }];
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
<section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-surface to-surface-secondary"></div>
  <div className="relative max-w-7xl mx-auto">
    <div className="text-center mb-16 animate-fade-in">
      <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground font-medium mb-4 animate-slide-in-left">
        <Award className="w-4 h-4" />
        <span>The #1 Food Tracking Tool</span>
      </div>
      <h1 className="text-4xl sm:text-6xl font-bold mb-6 tracking-tight leading-tight animate-fade-in-up text-black">
        The most advanced grocery<br />
        management system ever created.
      </h1>
      <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up">
        Precision-engineered AI technology meets intuitive design. Track inventory, optimize nutrition, and reduce waste with unprecedented accuracy.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-scale-in">
        <Link
          to="/profile-selector"
          className="px-8 py-4 rounded-full text-lg font-medium hover-lift text-white font-semibold transition-all duration-200 hover:opacity-90 flex justify-center sm:flex-row sm:items-center sm:space-x-2"
          style={{ backgroundColor: '#0077ff' }}
        >
          <span>Get started</span>
          {/* Hide icon on mobile */}
          <ArrowRight className="w-5 h-5 hidden sm:inline-block" />
        </Link>

        <button className="apple-button-secondary px-8 py-4 rounded-full text-lg font-medium hover-lift flex justify-center sm:flex-row sm:items-center sm:space-x-2">
          {/* Hide icon on mobile */}
          <PlayCircle className="w-5 h-5 hidden sm:inline-block" />
          <span>Watch demo</span>
        </button>
      </div>

      {/* Hero Visual - hide on mobile */}
      <div className="max-w-5xl mx-auto animate-fade-in-up hidden sm:block">
        <div className="glass-card rounded-3xl p-6 shadow-2xl animate-float">
          <img src={spendingChartHero} alt="Modern Spending Chart Dashboard" className="w-full h-auto rounded-2xl" />
        </div>
      </div>
    </div>
  </div>
</section>

      {/* Stats Section */}
      

      {/* Core Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Breakthrough technologies.
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Four core systems work together to deliver unprecedented accuracy and intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {mainFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return <div key={index} className="apple-card p-8 rounded-2xl hover-lift animate-fade-in-up" style={{
              animationDelay: `${index * 0.2}s`
            }}>
                  <div className="flex items-center mb-6">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mr-6">
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">{feature.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                    {feature.description}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {feature.specs.map((spec, specIndex) => <div key={specIndex} className="flex items-center text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary mr-3 flex-shrink-0" />
                        {spec}
                      </div>)}
                  </div>
                </div>;
          })}
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-surface-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Technical specifications
            </h2>
            <p className="text-xl text-muted-foreground">
              Precision engineering meets uncompromising performance.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {technicalSpecs.map((category, index) => <div key={index} className="apple-card p-8 rounded-2xl hover-lift animate-slide-in-left" style={{
            animationDelay: `${index * 0.2}s`
          }}>
                <h3 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.specs.map((spec, specIndex) => <div key={specIndex} className="flex justify-between items-center">
                      <span className="text-muted-foreground">{spec.label}</span>
                      <span className="text-foreground font-semibold">{spec.value}</span>
                    </div>)}
                </div>
              </div>)}
          </div>
        </div>
      </section>

      {/* Intelligence Showcase */}
<section className="py-24 px-4 sm:px-6 lg:px-8">
  <div className="max-w-7xl mx-auto">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
      <div className="animate-slide-in-left">
        <h2 className="text-4xl font-bold text-foreground mb-6">
          Intelligence that adapts<br />
          <span className="text-primary">to your lifestyle.</span>
        </h2>
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Advanced machine learning algorithms continuously analyze your shopping patterns, 
          dietary preferences, and consumption habits to deliver personalized insights.
        </p>
        
        <div className="space-y-8">
          {[{
            title: "89% Waste Reduction",
            description: "Our intelligent tracking system helps users reduce food waste by nearly 90% through smart expiration monitoring and consumption pattern analysis."
          }, {
            title: "150+ Countries",
            description: "Trusted globally with users across six continents, adapting to local shopping habits, currencies, and dietary preferences worldwide."
          }, {
            title: "99.9% Uptime",
            description: "Enterprise-grade infrastructure ensures your grocery data is always accessible when you need it, with industry-leading reliability standards."
          }].map((item, index) => (
            <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
              <h3 className="font-bold text-foreground mb-2 text-lg">{item.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="animate-slide-in-right hidden sm:block">
        <div className="apple-card p-8 rounded-3xl shadow-2xl hover-scale">
          <img src={freshGroceries} alt="Smart Grocery Organization" className="w-full h-auto rounded-2xl" />
        </div>
      </div>
    </div>
  </div>
</section>


      {/* Analytics Showcase */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-surface-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-in-left">
              <div className="apple-card p-8 rounded-3xl shadow-2xl hover-scale">
                <img src={analyticsDashboard} alt="Advanced Analytics Dashboard" className="w-full h-auto rounded-2xl" />
              </div>
            </div>
            
            <div className="animate-slide-in-right">
              <h2 className="text-4xl font-bold text-foreground mb-6">
                Advanced analytics.<br />
                <span className="text-primary">Actionable insights.</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Comprehensive data visualization transforms your grocery habits into meaningful insights. 
                Track every metric that matters with precision and clarity.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                {[{
                value: "$2,840",
                label: "Annual savings potential"
              }, {
                value: "94%",
                label: "Prediction accuracy"
              }, {
                value: "8.7/10",
                label: "Nutrition optimization"
              }, {
                value: "15 min",
                label: "Weekly time saved"
              }].map((metric, index) => <div key={index} className="apple-surface p-6 rounded-xl animate-scale-in" style={{
                animationDelay: `${index * 0.1}s`
              }}>
                    <div className="text-2xl font-bold text-foreground mb-1">{metric.value}</div>
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                  </div>)}
              </div>
              
              <div className="p-6 bg-surface rounded-xl border border-border">
                <p className="text-muted-foreground">
                  Real-time data processing with machine learning optimization delivers insights that adapt to your changing needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    

      {/* Awards & Recognition */}


      {/* Testimonials */}
      
      {/* Call to Action */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-foreground text-background">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h2 className="text-4xl font-bold mb-6">
            Ready to revolutionize your grocery management?
          </h2>
          <p className="text-xl opacity-90 mb-10">
            Join millions of users who have transformed their shopping habits with our AI-powered platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/profile-selector" className="bg-background text-foreground px-8 py-4 rounded-full font-bold text-lg hover-lift flex items-center space-x-2">
              <span>Start Free Today</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/pricing" className="border-2 border-background text-background px-8 py-4 rounded-full font-bold text-lg hover:bg-background hover:text-foreground transition-colors hover-lift">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>;
}
