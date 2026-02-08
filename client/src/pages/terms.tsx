/**
 * Terms of Service Page
 * 
 * Required for Google Safe Browsing trust signals
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { HeartPulse, ArrowLeft } from "lucide-react";

export default function TermsOfService() {
    return (
        <>
            <SEO
                title="Terms of Service | HealthMesh"
                description="HealthMesh terms of service. Read our terms and conditions for using the clinical decision support platform."
                keywords="terms of service, healthcare software terms, clinical AI terms"
            />

            <div className="min-h-screen bg-background text-foreground">
                {/* Navigation */}
                <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
                    <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/">
                            <div className="flex items-center gap-3 cursor-pointer group">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                                    <HeartPulse className="h-5 w-5" />
                                </div>
                                <span className="text-xl font-bold">
                                    Health<span className="text-primary">Mesh</span>
                                </span>
                            </div>
                        </Link>

                        <Link href="/" className="text-sm font-medium flex items-center gap-2 hover:text-primary transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Link>
                    </nav>
                </header>

                {/* Content */}
                <main className="pt-32 pb-24 px-6">
                    <div className="max-w-3xl mx-auto prose prose-lg dark:prose-invert">
                        <h1>Terms of Service</h1>
                        <p className="text-muted-foreground">Last updated: February 9, 2026</p>

                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using HealthMesh ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
                        </p>

                        <h2>2. Description of Service</h2>
                        <p>
                            HealthMesh is a clinical decision support platform that provides AI-powered recommendations to assist healthcare professionals. The Service is intended for use by licensed healthcare providers and authorized personnel only.
                        </p>

                        <h2>3. Medical Disclaimer</h2>
                        <p className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                            <strong>Important:</strong> HealthMesh is a clinical decision SUPPORT tool. It does not replace professional medical judgment. All clinical decisions remain the responsibility of the treating healthcare provider. AI recommendations should be verified before implementation.
                        </p>

                        <h2>4. User Responsibilities</h2>
                        <p>Users of HealthMesh agree to:</p>
                        <ul>
                            <li>Maintain the confidentiality of their account credentials</li>
                            <li>Use the Service only for legitimate healthcare purposes</li>
                            <li>Not share PHI inappropriately</li>
                            <li>Report any security concerns immediately</li>
                            <li>Verify AI recommendations before clinical implementation</li>
                        </ul>

                        <h2>5. Intellectual Property</h2>
                        <p>
                            The Service and its original content, features, and functionality are owned by HealthMesh and are protected by international copyright, trademark, and other intellectual property laws.
                        </p>

                        <h2>6. Limitation of Liability</h2>
                        <p>
                            HealthMesh shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. The Service is provided "as is" without warranties of any kind.
                        </p>

                        <h2>7. Data Processing</h2>
                        <p>
                            By using HealthMesh, you acknowledge that data may be processed in accordance with our Privacy Policy. For healthcare organizations, a Business Associate Agreement (BAA) is available upon request.
                        </p>

                        <h2>8. Termination</h2>
                        <p>
                            We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
                        </p>

                        <h2>9. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify these terms at any time. We will provide notice of significant changes via email or through the Service.
                        </p>

                        <h2>10. Contact Information</h2>
                        <p>
                            For questions about these Terms, please contact:<br />
                            Email: <a href="mailto:legal@healthmesh.io">legal@healthmesh.io</a>
                        </p>

                        <h2>11. Governing Law</h2>
                        <p>
                            These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.
                        </p>
                    </div>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/50 py-12 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <HeartPulse className="h-5 w-5 text-primary" />
                            <span className="font-bold">HealthMesh</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <Link href="/" className="hover:text-foreground">Home</Link>
                            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
                            <Link href="/terms" className="hover:text-foreground text-primary">Terms</Link>
                            <Link href="/contact" className="hover:text-foreground">Contact</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
