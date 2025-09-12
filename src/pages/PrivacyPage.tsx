import { useEffect } from "react";

export default function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">1. Information We Collect</h2>
            <p className="mb-3">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account information (email, password, username)</li>
              <li>Grocery lists and shopping data</li>
              <li>Budget and expense information</li>
              <li>Meal preferences and dietary restrictions</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">2. How We Use Your Information</h2>
            <p className="mb-3">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Provide and maintain our services</li>
              <li>Generate personalized meal recommendations</li>
              <li>Track your grocery expenses and budgets</li>
              <li>Send you notifications and updates</li>
              <li>Improve and optimize our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">3. Data Storage and Security</h2>
            <p>
              Your data is securely stored using Supabase infrastructure with industry-standard 
              encryption. We implement appropriate technical and organizational measures to protect 
              your personal information against unauthorized access, alteration, disclosure, or 
              destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">4. Third-Party Services</h2>
            <p className="mb-3">
              We may share your information with third-party service providers that help us operate 
              our business:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>PayPal for payment processing</li>
              <li>OpenAI for AI-powered meal generation</li>
              <li>Supabase for database and authentication services</li>
            </ul>
            <p className="mt-3">
              These providers are bound by confidentiality agreements and are only authorized to use 
              your information as necessary to provide services to us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">5. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to maintain your session, remember your 
              preferences, and analyze usage patterns. You can control cookies through your browser 
              settings, but disabling them may limit your ability to use certain features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">6. Your Rights</h2>
            <p className="mb-3">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal information</li>
              <li>Correct or update your information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">7. Children's Privacy</h2>
            <p>
              GoodPlates is not intended for use by children under 13 years of age. We do not knowingly 
              collect personal information from children under 13. If you believe we have collected 
              information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">8. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services and 
              fulfill the purposes outlined in this policy. When you delete your account, we will delete 
              or anonymize your personal information within 30 days, except where retention is required 
              by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">9. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than your country 
              of residence. We ensure appropriate safeguards are in place to protect your information 
              in accordance with this privacy policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page and updating the "Last updated" date. Your continued 
              use of GoodPlates after changes indicates your acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-foreground">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please contact us 
              at:
            </p>
            <div className="mt-3">
              <p>Email: privacy@goodplates.com</p>
              <p>Or use our Contact form</p>
            </div>
          </section>

          <div className="pt-8 text-sm text-muted-foreground">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}