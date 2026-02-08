/**
 * Privacy Policy Page
 * 
 * Required for Google Safe Browsing trust signals
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo";
import { HeartPulse, ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
    return (
        <>
            <SEO
                title="Privacy Policy | HealthMesh"
                description="HealthMesh privacy policy. Learn how we protect your data and maintain HIPAA compliance."
                keywords="privacy policy, HIPAA compliance, healthcare data protection"
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
                        <h1>Privacy Policy</h1>
                        <p className="text-muted-foreground">Last updated: February 9, 2026</p>

                        <h2>Introduction</h2>
                        <p>
                            HealthMesh ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our clinical decision support platform.
                        </p>

                        <h2>HIPAA Compliance</h2>
                        <p>
                            HealthMesh is designed to be HIPAA compliant. We implement administrative, physical, and technical safeguards to protect Protected Health Information (PHI) as required by the Health Insurance Portability and Accountability Act.
                        </p>

                        <h2>Information We Collect</h2>
                        <h3>Information You Provide</h3>
                        <ul>
                            <li>Account information (name, email, organization)</li>
                            <li>Contact form submissions</li>
                            <li>Support requests</li>
                        </ul>

                        <h3>Automatically Collected Information</h3>
                        <ul>
                            <li>Device and browser information</li>
                            <li>IP address</li>
                            <li>Usage analytics (via Google Analytics)</li>
                        </ul>

                        <h2>How We Use Your Information</h2>
                        <ul>
                            <li>To provide and maintain our service</li>
                            <li>To respond to your inquiries</li>
                            <li>To improve our platform</li>
                            <li>To comply with legal obligations</li>
                        </ul>

                        <h2>Data Security</h2>
                        <p>
                            We implement industry-standard security measures including:
                        </p>
                        <ul>
                            <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
                            <li>Role-based access controls</li>
                            <li>Regular security audits</li>
                            <li>SOC 2 Type II compliance</li>
                        </ul>

                        <h2>Data Retention</h2>
                        <p>
                            We retain your information only as long as necessary to provide our services and comply with legal obligations. You may request deletion of your data at any time.
                        </p>

                        <h2>Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access your personal data</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Opt-out of marketing communications</li>
                        </ul>

                        <h2>Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy, please contact us at:
                        </p>
                        <p>
                            Email: <a href="mailto:privacy@healthmesh.io">privacy@healthmesh.io</a><br />
                            Address: HealthMesh Inc., Healthcare Technology Division
                        </p>

                        <h2>Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
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
                            <Link href="/privacy" className="hover:text-foreground text-primary">Privacy</Link>
                            <Link href="/terms" className="hover:text-foreground">Terms</Link>
                            <Link href="/contact" className="hover:text-foreground">Contact</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
