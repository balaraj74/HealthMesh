/**
 * Public Landing Page
 * 
 * SEO-optimized marketing homepage for HealthMesh
 * This page is public and indexed by search engines
 */

import { Link } from "wouter";
import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";

// Lazy load the dashboard preview to keep initial bundle small
const InteractiveDashboardPreview = lazy(() =>
    import("@/components/interactive-dashboard-preview").then(m => ({ default: m.InteractiveDashboardPreview }))
);
import {
    HeartPulse,
    Shield,
    Zap,
    Brain,
    Activity,
    Users,
    CheckCircle2,
    ArrowRight,
    Stethoscope,
    FlaskConical,
    AlertTriangle,
    TrendingUp,
    Lock,
    Globe,
    Award,
    Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Features data
const features = [
    {
        icon: Brain,
        title: "AI-Powered Decision Support",
        description: "Multi-agent AI system that analyzes patient data, research, and guidelines to provide evidence-based clinical recommendations.",
        color: "text-sky-400",
        bgColor: "bg-sky-500/10",
    },
    {
        icon: Shield,
        title: "Medication Safety",
        description: "Real-time detection of drug interactions, contraindications, and dosing errors to prevent adverse drug events.",
        color: "text-rose-400",
        bgColor: "bg-rose-500/10",
    },
    {
        icon: FlaskConical,
        title: "Lab Trend Analysis",
        description: "Intelligent interpretation of laboratory results with trend analysis and clinical correlation.",
        color: "text-teal-400",
        bgColor: "bg-teal-500/10",
    },
    {
        icon: AlertTriangle,
        title: "Early Deterioration Detection",
        description: "AI early warning system that identifies patients at risk of clinical deterioration before it happens.",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
    },
    {
        icon: Activity,
        title: "Explainable AI",
        description: "Every recommendation comes with transparent reasoning, evidence citations, and confidence scores.",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
    },
    {
        icon: Globe,
        title: "FHIR Interoperability",
        description: "Seamless integration with existing EHR systems through FHIR R4 standards.",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
    },
];

// Stats data
const stats = [
    { value: "60%", label: "Reduction in ADEs", icon: Shield },
    { value: "45%", label: "Faster Diagnoses", icon: Zap },
    { value: "99.9%", label: "Uptime SLA", icon: Activity },
    { value: "HIPAA", label: "Compliant", icon: Lock },
];

// Trust badges
const trustBadges = [
    "HIPAA Compliant",
    "SOC 2 Type II",
    "FHIR R4 Certified",
    "Enterprise Security",
];

export default function LandingPage() {
    return (
        <>
            <SEO
                title="AI-Powered Clinical Decision Support for Healthcare"
                description="HealthMesh is an enterprise healthcare AI platform providing explainable clinical decision support, medication safety, lab analysis, and FHIR interoperability. HIPAA compliant."
                keywords="clinical decision support system, healthcare AI, medication safety, drug interaction checker, FHIR, HIPAA compliant, hospital AI, patient safety"
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
                            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                            <Link href="/solutions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Solutions</Link>
                            <a href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a>
                            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
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

                {/* Main Content */}
                <main>
                    {/* Hero Section */}
                    <section className="pt-32 pb-20 px-6">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center max-w-4xl mx-auto">
                                {/* Trust badges */}
                                <div className="flex flex-wrap justify-center gap-2 mb-8 opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
                                    {trustBadges.map((badge, i) => (
                                        <Badge
                                            key={badge}
                                            variant="outline"
                                            className="text-xs px-3 py-1 rounded-full border-primary/30 text-primary bg-primary/5"
                                            style={{ animationDelay: `${i * 100}ms` }}
                                        >
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            {badge}
                                        </Badge>
                                    ))}
                                </div>

                                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                                    AI-Powered
                                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400">
                                        Clinical Decision Support
                                    </span>
                                </h1>

                                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto opacity-0 animate-slideUp" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                                    Enterprise healthcare AI platform that empowers clinicians with
                                    <strong className="text-foreground"> explainable, evidence-based recommendations</strong> for safer, faster patient care.
                                </p>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-slideUp" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                                    <Button size="lg" asChild className="glow-cta text-lg px-8 py-6">
                                        <Link href="/login">
                                            <Stethoscope className="mr-2 h-5 w-5" />
                                            Request Demo
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                                        <a href="#features">
                                            Explore Features
                                        </a>
                                    </Button>
                                </div>

                                {/* Hero visual - Interactive Dashboard Preview */}
                                <div className="mt-16 relative opacity-0 animate-fadeIn" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
                                    <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-xl p-2 shadow-2xl">
                                        <Suspense fallback={
                                            <div className="w-full rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 min-h-[300px] flex items-center justify-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                                    <span className="text-sm text-white/50">Loading dashboard preview...</span>
                                                </div>
                                            </div>
                                        }>
                                            <InteractiveDashboardPreview />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Stats Section */}
                    <section className="py-16 px-6 border-y border-border/50 bg-muted/20">
                        <div className="max-w-7xl mx-auto">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {stats.map((stat, i) => (
                                    <div
                                        key={stat.label}
                                        className="text-center opacity-0 animate-slideUp"
                                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                                        <div className="text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Features Section */}
                    <section id="features" className="py-24 px-6">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-center mb-16">
                                <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                    Platform Features
                                </Badge>
                                <h2 className="text-4xl font-bold mb-4">
                                    Everything You Need for
                                    <span className="text-primary"> Smarter Clinical Decisions</span>
                                </h2>
                                <p className="text-muted-foreground max-w-2xl mx-auto">
                                    Our multi-agent AI system orchestrates specialized agents to deliver comprehensive clinical insights.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {features.map((feature, i) => (
                                    <Card
                                        key={feature.title}
                                        className="rounded-2xl card-hover-subtle opacity-0 animate-slideUp"
                                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <CardContent className="p-6">
                                            <div className={cn(
                                                "flex h-12 w-12 items-center justify-center rounded-xl border border-border/50 mb-4",
                                                feature.bgColor
                                            )}>
                                                <feature.icon className={cn("h-6 w-6", feature.color)} />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Security Section */}
                    <section id="security" className="py-24 px-6 bg-muted/20">
                        <div className="max-w-7xl mx-auto">
                            <div className="grid lg:grid-cols-2 gap-12 items-center">
                                <div>
                                    <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                        Enterprise Security
                                    </Badge>
                                    <h2 className="text-4xl font-bold mb-6">
                                        Built for Healthcare
                                        <span className="text-primary"> Compliance</span>
                                    </h2>
                                    <p className="text-muted-foreground mb-8">
                                        HealthMesh is designed from the ground up with healthcare compliance and security in mind.
                                        Your patient data is protected by enterprise-grade security measures.
                                    </p>

                                    <div className="space-y-4">
                                        {[
                                            { icon: Lock, title: "HIPAA Compliant", desc: "Full compliance with HIPAA Privacy and Security Rules" },
                                            { icon: Shield, title: "SOC 2 Type II", desc: "Audited security controls and processes" },
                                            { icon: Award, title: "ISO 27001", desc: "Information security management certification" },
                                            { icon: Building2, title: "Enterprise SSO", desc: "Microsoft Entra ID integration for secure access" },
                                        ].map((item, i) => (
                                            <div key={item.title} className="flex items-start gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                                                    <item.icon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base">{item.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-teal-500/20 rounded-3xl blur-3xl" />
                                    <Card className="relative rounded-3xl">
                                        <CardContent className="p-8">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center">
                                                    <Lock className="h-7 w-7 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold">Zero Trust Architecture</h3>
                                                    <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                {["End-to-end encryption", "Role-based access control", "Audit logging", "Data anonymization"].map((item) => (
                                                    <div key={item} className="flex items-center gap-3">
                                                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                                        <span className="text-sm">{item}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CTA Section */}
                    <section className="py-24 px-6">
                        <div className="max-w-4xl mx-auto text-center">
                            <h2 className="text-4xl font-bold mb-6">
                                Ready to Transform Your
                                <span className="text-primary"> Clinical Workflow?</span>
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Join leading healthcare organizations using HealthMesh to improve patient outcomes
                                and support clinical decision-making with AI.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button size="lg" asChild className="glow-cta text-lg px-8 py-6">
                                    <Link href="/login">
                                        <Stethoscope className="mr-2 h-5 w-5" />
                                        Request Demo
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                                    <a href="mailto:balarajr483@gmail.com">
                                        Contact Sales
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="border-t border-border/50 py-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-4 gap-8 mb-8">
                            {/* Brand */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-sky-400 text-white">
                                        <HeartPulse className="h-4 w-4" />
                                    </div>
                                    <span className="text-lg font-bold">HealthMesh</span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    AI-Powered Clinical Decision Support for Healthcare
                                </p>
                            </div>

                            {/* Solutions */}
                            <div>
                                <p className="font-semibold mb-4">Solutions</p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Clinical Decision Support</Link></li>
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Medication Safety</Link></li>
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Lab Interpretation</Link></li>
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Early Deterioration</Link></li>
                                </ul>
                            </div>

                            {/* Company */}
                            <div>
                                <p className="font-semibold mb-4">Company</p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                                    <li><Link href="/about" className="hover:text-foreground transition-colors">Careers</Link></li>
                                    <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                                    <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                                </ul>
                            </div>

                            {/* Legal */}
                            <div>
                                <p className="font-semibold mb-4">Compliance</p>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li><a href="#security" className="hover:text-foreground transition-colors">HIPAA</a></li>
                                    <li><a href="#security" className="hover:text-foreground transition-colors">Security</a></li>
                                    <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                © 2026 HealthMesh. All rights reserved. HIPAA Compliant • SOC 2 Type II
                            </p>
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-xs">
                                    <Shield className="h-3 w-3 mr-1" />
                                    HIPAA
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                    <Award className="h-3 w-3 mr-1" />
                                    SOC 2
                                </Badge>
                            </div>
                        </div>

                        {/* Clinical Disclaimer */}
                        <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border/50">
                            <p className="text-xs text-muted-foreground text-center">
                                <strong>Clinical Disclaimer:</strong> HealthMesh provides clinical decision support tools designed to assist healthcare professionals.
                                Our platform does not replace clinical judgment. All AI-generated insights require clinician review and verification.
                                This content is for informational purposes only and does not constitute medical advice.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
