/**
 * Pricing Page
 * 
 * SEO-optimized pricing page for HealthMesh
 * Public page - indexed by search engines
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import {
    HeartPulse,
    Check,
    ArrowRight,
    Building2,
    Stethoscope,
    Shield,
    Users,
    Zap,
    Clock,
    Phone,
    Mail,
    HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Pricing tiers
const tiers = [
    {
        name: "Starter",
        description: "For small practices getting started with clinical AI",
        price: "Contact Us",
        priceNote: "Custom pricing based on volume",
        highlight: false,
        features: [
            "Up to 100 cases/month",
            "2 AI agents included",
            "Basic drug interaction checking",
            "Email support",
            "HIPAA compliant",
            "Standard SLA",
        ],
        cta: "Contact Sales",
        ctaVariant: "outline" as const,
    },
    {
        name: "Professional",
        description: "Comprehensive AI support for growing healthcare organizations",
        price: "Contact Us",
        priceNote: "Volume-based enterprise pricing",
        highlight: true,
        badge: "Most Popular",
        features: [
            "Unlimited cases",
            "All 6 AI agents included",
            "Full medication safety suite",
            "Lab trend analysis",
            "Early deterioration detection",
            "Priority support",
            "99.9% uptime SLA",
            "Custom integrations",
            "Dedicated success manager",
        ],
        cta: "Request Demo",
        ctaVariant: "default" as const,
    },
    {
        name: "Enterprise",
        description: "Full-scale deployment with advanced customization",
        price: "Custom",
        priceNote: "Tailored to your organization",
        highlight: false,
        features: [
            "Everything in Professional",
            "On-premise deployment option",
            "Custom AI model training",
            "Advanced analytics & reporting",
            "Multi-site deployment",
            "24/7 phone support",
            "Dedicated infrastructure",
            "Custom compliance reports",
            "Executive business reviews",
        ],
        cta: "Contact Sales",
        ctaVariant: "outline" as const,
    },
];

// FAQs
const faqs = [
    {
        q: "Is HealthMesh HIPAA compliant?",
        a: "Yes, HealthMesh is fully HIPAA compliant. We maintain SOC 2 Type II certification and undergo regular third-party security audits.",
    },
    {
        q: "How long does implementation take?",
        a: "Most implementations are completed within 4-8 weeks, depending on your EHR system and customization requirements.",
    },
    {
        q: "Do you integrate with our existing EHR?",
        a: "Yes, HealthMesh integrates with all major EHR systems through FHIR R4 and HL7 standards. We also offer custom integration options.",
    },
    {
        q: "What training is provided?",
        a: "We provide comprehensive training for clinical and technical staff, including live sessions, documentation, and ongoing support.",
    },
    {
        q: "Can we start with a pilot program?",
        a: "Absolutely. We recommend starting with a pilot in one department or unit before organization-wide deployment.",
    },
    {
        q: "What support is included?",
        a: "All plans include email support. Professional and Enterprise plans include priority support with faster response times.",
    },
];

export default function PricingPage() {
    return (
        <>
            <SEO
                title="Pricing | Healthcare AI Solutions"
                description="HealthMesh pricing for healthcare AI clinical decision support. Flexible plans for small practices to large health systems. HIPAA compliant. Contact for custom pricing."
                keywords="healthcare AI pricing, clinical decision support cost, hospital AI software pricing, CDSS pricing, healthcare technology pricing"
            />

            <div className="min-h-screen bg-background">
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

                        <div className="hidden md:flex items-center gap-8">
                            <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                            <Link href="/solutions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Solutions</Link>
                            <a href="/#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a>
                            <Link href="/pricing" className="text-sm text-primary font-medium">Pricing</Link>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" asChild>
                                <Link href="/login">Sign In</Link>
                            </Button>
                            <Button asChild className="glow-cta">
                                <Link href="/login">
                                    Get Started
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </nav>
                </header>

                {/* Hero Section */}
                <section className="pt-32 pb-16 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                            <Building2 className="h-3 w-3 mr-1" />
                            Enterprise Pricing
                        </Badge>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                            Simple, Transparent
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400">
                                Pricing
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                            Flexible pricing designed for healthcare organizations of all sizes.
                            All plans include HIPAA compliance and enterprise security.
                        </p>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="py-16 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {tiers.map((tier, i) => (
                                <Card
                                    key={tier.name}
                                    className={cn(
                                        "rounded-2xl relative opacity-0 animate-slideUp",
                                        tier.highlight && "border-primary shadow-lg shadow-primary/10"
                                    )}
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    {tier.badge && (
                                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                                            {tier.badge}
                                        </Badge>
                                    )}
                                    <CardHeader className="text-center pb-4">
                                        <CardTitle className="text-2xl">{tier.name}</CardTitle>
                                        <CardDescription>{tier.description}</CardDescription>
                                        <div className="mt-4">
                                            <span className="text-4xl font-bold">{tier.price}</span>
                                            <p className="text-sm text-muted-foreground mt-1">{tier.priceNote}</p>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <ul className="space-y-3">
                                            {tier.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm">
                                                    <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Button
                                            variant={tier.ctaVariant}
                                            className={cn("w-full", tier.highlight && "glow-cta")}
                                            asChild
                                        >
                                            <Link href="/login">
                                                {tier.cta}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features included in all plans */}
                <section className="py-16 px-6 bg-muted/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4">Included in All Plans</h2>
                            <p className="text-muted-foreground">Essential features for healthcare AI compliance and security</p>
                        </div>
                        <div className="grid md:grid-cols-4 gap-6">
                            {[
                                { icon: Shield, title: "HIPAA Compliant", desc: "Full regulatory compliance" },
                                { icon: Zap, title: "Fast Deployment", desc: "Up and running in weeks" },
                                { icon: Users, title: "User Training", desc: "Comprehensive onboarding" },
                                { icon: Clock, title: "Regular Updates", desc: "Continuous improvements" },
                            ].map((item, i) => (
                                <Card
                                    key={item.title}
                                    className="rounded-2xl text-center opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
                                            <item.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="font-semibold mb-1">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQs */}
                <section className="py-24 px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                <HelpCircle className="h-3 w-3 mr-1" />
                                FAQ
                            </Badge>
                            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                        </div>
                        <div className="grid gap-6">
                            {faqs.map((faq, i) => (
                                <Card
                                    key={faq.q}
                                    className="rounded-2xl opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="p-6">
                                        <h3 className="font-semibold mb-2">{faq.q}</h3>
                                        <p className="text-sm text-muted-foreground">{faq.a}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="py-24 px-6 bg-muted/20">
                    <div className="max-w-4xl mx-auto">
                        <Card className="rounded-3xl bg-gradient-to-br from-primary/10 to-teal-500/10 border-primary/20">
                            <CardContent className="p-12 text-center">
                                <h2 className="text-4xl font-bold mb-4">
                                    Ready to Get Started?
                                </h2>
                                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                    Contact our team for a personalized demo and custom pricing quote
                                    tailored to your organization's needs.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                                    <Button size="lg" asChild className="glow-cta text-lg px-8 py-6">
                                        <Link href="/login">
                                            <Stethoscope className="mr-2 h-5 w-5" />
                                            Request Demo
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                                        <a href="mailto:balarajr483@gmail.com">
                                            <Mail className="mr-2 h-5 w-5" />
                                            Contact Sales
                                        </a>
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        +91 8431206594
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        balarajr483@gmail.com
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-border/50 py-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-sky-400 text-white">
                                    <HeartPulse className="h-4 w-4" />
                                </div>
                                <span className="text-lg font-bold">HealthMesh</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                © 2026 HealthMesh. HIPAA Compliant • SOC 2 Type II
                            </p>
                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                                <Link href="/solutions" className="hover:text-foreground transition-colors">Solutions</Link>
                                <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
