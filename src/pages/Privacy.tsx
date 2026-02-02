import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4 md:pt-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">
            <strong className="text-foreground">Last Updated:</strong> February 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              VibeBaze ("we", "our", "us") is committed to protecting your privacy. This Privacy 
              Policy explains how we collect, use, disclose, and safeguard your information when 
              you use our African-first social video platform.
            </p>
            <p className="mt-2">
              We operate in compliance with the <strong>Kenya Data Protection Act, 2019</strong> and 
              other applicable data protection regulations across Africa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Account information: email, username, full name, profile picture</li>
              <li>Phone number: required for monetization features (+254 Kenyan numbers)</li>
              <li>Content: videos, photos, audio, text posts you create</li>
              <li>Communications: messages and feedback you send us</li>
              <li>Payment information: M-PESA phone number for transactions</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Device information: device type, operating system, browser type</li>
              <li>Usage data: pages viewed, features used, time spent</li>
              <li>Location: general location based on IP address (not precise GPS)</li>
              <li>Cookies and similar technologies for session management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send payment notifications</li>
              <li>Send push notifications about activity on your account</li>
              <li>Personalize your content feed and recommendations</li>
              <li>Detect and prevent fraud, abuse, and security issues</li>
              <li>Comply with legal obligations</li>
              <li>Communicate updates about our services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Other users:</strong> Your profile, posts, and public activity</li>
              <li><strong>Payment processors:</strong> M-PESA/Safaricom and Paystack for transaction processing</li>
              <li><strong>Service providers:</strong> Cloud hosting, analytics, and push notification services</li>
              <li><strong>Legal authorities:</strong> When required by law or to protect rights and safety</li>
            </ul>
            <p className="mt-3">
              We do NOT sell your personal data to third parties for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Security</h2>
            <p>We implement appropriate security measures including:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication mechanisms</li>
              <li>Regular security audits and monitoring</li>
              <li>Access controls limiting employee data access</li>
            </ul>
            <p className="mt-3">
              However, no method of transmission over the internet is 100% secure. We cannot 
              guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>Under the Kenya Data Protection Act, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Access your personal data we hold</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Delete your data (subject to legal retention requirements)</li>
              <li>Object to processing of your data</li>
              <li>Withdraw consent at any time</li>
              <li>Port your data to another service</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at privacy@vibebaze.app
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to 
              provide services. After account deletion:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Profile data is deleted within 30 days</li>
              <li>Transaction records are retained for 7 years (legal requirement)</li>
              <li>Anonymized analytics data may be retained indefinitely</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Children's Privacy</h2>
            <p>
              VibeBaze is not intended for children under 13. We do not knowingly collect personal 
              data from children under 13. If we discover such data has been collected, we will 
              delete it immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries outside Kenya. We ensure 
              appropriate safeguards are in place for such transfers in compliance with applicable 
              data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant 
              changes via the app or email. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">11. Contact Us</h2>
            <p>For privacy-related inquiries:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Email: privacy@vibebaze.app</li>
              <li>Data Protection Officer: dpo@vibebaze.app</li>
            </ul>
          </section>

          <section className="border-t border-border pt-6">
            <p className="text-center">
              <strong className="text-foreground">VibeBaze</strong> — Your privacy matters to us 🔒
            </p>
            <p className="text-center text-sm mt-2">
              Built for African Creators, with African data protection in mind.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
