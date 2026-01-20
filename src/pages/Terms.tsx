import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

const Terms = () => {
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
          <h1 className="text-2xl font-bold text-foreground">Terms & Conditions</h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">
            <strong className="text-foreground">Last Updated:</strong> January 2026
          </p>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. About VibeLoop</h2>
            <p>
              VibeLoop is an African-first social video platform designed to empower African creators 
              to share content, build communities, and earn money through their creativity. By using 
              VibeLoop, you agree to these Terms & Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use VibeLoop. If you are under 18, you must have 
              parental or guardian consent. To use monetization features (receiving tips, withdrawals), 
              you must:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Be at least 18 years old</li>
              <li>Have a valid Kenyan phone number (+254)</li>
              <li>Have an active M-PESA account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Account Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Maintaining the security of your account</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and truthful information</li>
              <li>Keeping your phone number and payment details up to date</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Content Guidelines</h2>
            <p>You agree NOT to post content that:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Is illegal, harmful, or violates others' rights</li>
              <li>Contains hate speech, harassment, or threats</li>
              <li>Is sexually explicit or exploitative</li>
              <li>Infringes on intellectual property rights</li>
              <li>Contains spam, scams, or misleading information</li>
              <li>Promotes violence, terrorism, or illegal activities</li>
            </ul>
            <p className="mt-3">
              VibeLoop reserves the right to remove content and suspend accounts that violate these 
              guidelines without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Monetization & Payments</h2>
            <p>
              VibeLoop enables creators to earn money through tips and content rewards. Key terms:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>All transactions are in Kenyan Shillings (KES)</li>
              <li>A platform fee of 10% applies to tips received</li>
              <li>Minimum withdrawal amount is KSh 50</li>
              <li>Withdrawals are processed via M-PESA only</li>
              <li>A valid Kenyan phone number (+254) is required for all money transactions</li>
              <li>Processing times may vary; VibeLoop is not responsible for M-PESA delays</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              You retain ownership of content you create and post on VibeLoop. However, by posting 
              content, you grant VibeLoop a non-exclusive, worldwide, royalty-free license to use, 
              display, reproduce, and distribute your content on the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Jurisdiction</h2>
            <p>
              These Terms are governed by the laws of the Republic of Kenya. Any disputes shall be 
              resolved in the courts of Kenya. VibeLoop operates in compliance with Kenyan data 
              protection laws and the Kenya Data Protection Act, 2019.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Termination</h2>
            <p>
              VibeLoop may suspend or terminate your account at any time for violations of these 
              Terms. Upon termination, you lose access to your account and any pending earnings 
              below the minimum withdrawal threshold may be forfeited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Limitation of Liability</h2>
            <p>
              VibeLoop is provided "as is" without warranties of any kind. We are not liable for 
              any indirect, incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of VibeLoop after changes 
              constitutes acceptance of the new Terms. We will notify users of significant changes 
              via the app or email.
            </p>
          </section>

          <section className="border-t border-border pt-6">
            <p className="text-center">
              <strong className="text-foreground">VibeLoop</strong> — Built for African Creators 🌍
            </p>
            <p className="text-center text-sm mt-2">
              Questions? Contact us at support@vibeloop.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
