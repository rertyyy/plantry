import { useEffect } from "react";

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        
        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing and using GoodPlates, you agree to be bound by these Terms and Conditions. 
              If you do not agree with any part of these terms, you may not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">2. Service Description</h2>
            <p>
              GoodPlates is a grocery management and meal planning application that helps users track 
              their grocery shopping, manage budgets, and generate AI-powered meal recommendations. 
              The service includes features for expense tracking, analytics, and personalized insights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and 
              for all activities that occur under your account. You must notify us immediately of any 
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">4. Subscription and Billing</h2>
            <p>
              GoodPlates offers both free and paid subscription tiers. Paid subscriptions are billed 
              monthly or annually through PayPal. You may cancel your subscription at any time through 
              your account settings. Refunds are subject to our refund policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">5. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. We collect and process your data in accordance with our 
              Privacy Policy. By using GoodPlates, you consent to our data practices as described in 
              the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">6. Acceptable Use</h2>
            <p>
              You agree not to use GoodPlates for any unlawful purpose or in any way that could damage, 
              disable, overburden, or impair our servers or networks. You may not attempt to gain 
              unauthorized access to any portion of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">7. Intellectual Property</h2>
            <p>
              All content, features, and functionality of GoodPlates are owned by us and are protected 
              by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">8. Limitation of Liability</h2>
            <p>
              GoodPlates is provided "as is" without warranties of any kind. We shall not be liable for 
              any indirect, incidental, special, consequential, or punitive damages resulting from your 
              use or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">9. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes via email or through the service. Your continued use of GoodPlates after 
              such modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">10. Contact Information</h2>
            <p>
              If you have any questions about these Terms and Conditions, please contact us through 
              our Contact page or email us at support@goodplates.com.
            </p>
          </section>

          <div className="pt-8 text-sm text-muted-foreground">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}