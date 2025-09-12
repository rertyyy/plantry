import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center space-y-4">
          <nav className="flex flex-wrap gap-6">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/pricing" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link 
              to="/contact" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
            <Link 
              to="/auth" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </Link>
          </nav>
          
          <Separator className="w-full max-w-xs" />
          
          <nav className="flex gap-6">
            <Link 
              to="/terms" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms & Conditions
            </Link>
            <Link 
              to="/privacy" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
          
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GoodPlates. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}