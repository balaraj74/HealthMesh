/**
 * Solutions Page
 * 
 * SEO-optimized solutions overview page for HealthMesh
 * Public page - indexed by search engines
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import {
    HeartPulse,
    Brain,
    Shield,
    FlaskConical,
    AlertTriangle,
    Activity,
    ArrowRight,
    CheckCircle2,
    Building2,
    Stethoscope,
    Pill,
    TrendingUp,
    Users,
    Clock,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Solutions data
const solutions = [
    {
        id: "clinical-decision-support",
        icon: Brain,
        title: "Clinical Decision Support",
        shortDesc: "AI-powered insights for complex clinical cases",
        fullDesc: "Our multi-agent AI system analyzes patient data, medical research, and clinical guidelines to provide evidence-based recommendations that support clinician decision-making.",
        color: "text-sky-400",
        bgColor: "bg-sky-500/10",
        borderColor: "border-sky-500/30",
        benefits: [
            "Evidence-based recommendations with citations",
            "Multi-agent AI orchestration",
            "Real-time clinical insights",
            "Explainable reasoning with confidence scores",
        ],
        useCases: [
            "Tumor board case reviews",
            "Complex diagnostic workups",
            "Treatment planning",
            "Second opinion support",
        ],
        stats: { value: "45%", label: "Faster diagnoses" },
    },
    {
        id: "medication-safety",
        icon: Pill,
        title: "Medication Safety",
        shortDesc: "Prevent adverse drug events with AI",
        fullDesc: "Real-time detection of drug interactions, contraindications, allergies, and dosing errors. Our AI continuously monitors medication orders to keep patients safe.",
        color: "text-rose-400",
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/30",
        benefits: [
            "Drug-drug interaction detection",
            "Contraindication alerts",
            "Dose verification",
            "Allergy cross-reference",
        ],
        useCases: [
            "Pharmacy order verification",
            "Prescribing at point of care",
            "Medication reconciliation",
            "High-risk medication monitoring",
        ],
        stats: { value: "60%", label: "Reduction in ADEs" },
    },
    {
        id: "lab-interpretation",
        icon: FlaskConical,
        title: "Lab Trend Interpretation",
        shortDesc: "Intelligent laboratory result analysis",
        fullDesc: "AI-powered interpretation of laboratory results with trend analysis, clinical correlation, and proactive alerting for concerning patterns.",
        color: "text-teal-400",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/30",
        benefits: [
            "Trend analysis over time",
            "Clinical correlation",
            "Abnormality detection",
            "Predictive insights",
        ],
        useCases: [
            "Post-operative monitoring",
            "Chronic disease management",
            "Critical value alerting",
            "Diagnostic support",
        ],
        stats: { value: "35%", label: "Earlier intervention" },
    },
    {
        id: "early-deterioration",
        icon: AlertTriangle,
        title: "Early Deterioration Detection",
        shortDesc: "AI early warning for patient decline",
        fullDesc: "Proactive identification of patients at risk of clinical deterioration using AI analysis of vitals, labs, and clinical notes. Intervene before emergencies happen.",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
        benefits: [
            "Early warning scores",
            "Vital sign trend analysis",
            "Sepsis risk prediction",
            "ICU transfer prediction",
        ],
        useCases: [
            "General ward monitoring",
            "Step-down unit care",
            "Post-surgical monitoring",
            "Rapid response optimization",
        ],
        stats: { value: "40%", label: "Faster escalation" },
    },
];

// Why choose section
const whyChoose = [
    {
        icon: Zap,
        title: "Real-Time Insights",
        desc: "Get AI-powered recommendations in seconds, not hours",
    },
    {
        icon: Shield,
        title: "HIPAA Compliant",
        desc: "Enterprise-grade security and compliance built-in",
    },
    {
        icon: Activity,
        title: "Explainable AI",
        desc: "Every recommendation comes with transparent reasoning",
    },
    {
        icon: Users,
        title: "Clinician-Designed",
        desc: "Built with physicians, for physicians",
    },
];

export default function SolutionsPage() {
    return (
        <>
            <SEO
                title="Healthcare AI Solutions | Clinical Decision Support"
                description="Explore HealthMesh healthcare AI solutions: clinical decision support, medication safety, lab interpretation, and early deterioration detection. HIPAA compliant."
                keywords="healthcare AI solutions, clinical decision support, medication safety AI, lab interpretation, early warning system, hospital AI software"
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
                            <Link href="/solutions" className="text-sm text-primary font-medium">Solutions</Link>
                            <a href="/#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</a>
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

                {/* Hero Section */}
                <section className="pt-32 pb-16 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                            <Building2 className="h-3 w-3 mr-1" />
                            Enterprise Solutions
                        </Badge>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                            AI Solutions for
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400">
                                Modern Healthcare
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                            Purpose-built AI tools that integrate seamlessly with your clinical workflow,
                            helping your team deliver safer, faster, and more informed patient care.
                        </p>
                    </div>
                </section>

                {/* Solutions Grid */}
                <section className="py-16 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-2 gap-8">
                            {solutions.map((solution, i) => (
                                <Card
                                    key={solution.id}
                                    className={cn(
                                        "rounded-2xl overflow-hidden opacity-0 animate-slideUp group hover:shadow-xl transition-all duration-300",
                                        solution.borderColor
                                    )}
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className={cn(
                                                "flex h-14 w-14 items-center justify-center rounded-xl border border-border/50 mb-4 group-hover:scale-110 transition-transform",
                                                solution.bgColor
                                            )}>
                                                <solution.icon className={cn("h-7 w-7", solution.color)} />
                                            </div>
                                            <Badge variant="outline" className={cn("text-xs", solution.color, solution.borderColor)}>
                                                {solution.stats.value} {solution.stats.label}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-2xl">{solution.title}</CardTitle>
                                        <p className="text-muted-foreground">{solution.fullDesc}</p>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Benefits */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                Key Benefits
                                            </h4>
                                            <ul className="grid grid-cols-2 gap-2">
                                                {solution.benefits.map((benefit) => (
                                                    <li key={benefit} className="text-sm text-muted-foreground flex items-start gap-2">
                                                        <span className="text-primary mt-1">•</span>
                                                        {benefit}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Use Cases */}
                                        <div>
                                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                <Stethoscope className="h-4 w-4 text-primary" />
                                                Use Cases
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {solution.useCases.map((useCase) => (
                                                    <Badge key={useCase} variant="secondary" className="text-xs">
                                                        {useCase}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* CTA */}
                                        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            Learn More
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Why Choose Section */}
                <section className="py-24 px-6 bg-muted/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl font-bold mb-4">
                                Why Choose <span className="text-primary">HealthMesh</span>
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                Built by healthcare professionals, for healthcare professionals.
                                Our platform is designed to enhance, not replace, clinical judgment.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {whyChoose.map((item, i) => (
                                <Card
                                    key={item.title}
                                    className="rounded-2xl text-center opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="pt-6">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
                                            <item.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="font-semibold mb-2">{item.title}</h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 px-6">
                    <div className="max-w-4xl mx-auto">
                        <Card className="rounded-3xl bg-gradient-to-br from-primary/10 to-teal-500/10 border-primary/20">
                            <CardContent className="p-12 text-center">
                                <h2 className="text-4xl font-bold mb-4">
                                    Ready to Transform Your Clinical Workflow?
                                </h2>
                                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                    Schedule a personalized demo to see how HealthMesh can help your organization
                                    improve patient outcomes and support clinical decision-making.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <Button size="lg" asChild className="glow-cta text-lg px-8 py-6">
                                        <Link href="/login">
                                            <Stethoscope className="mr-2 h-5 w-5" />
                                            Request Demo
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                                        <Link href="/pricing">
                                            View Pricing
                                        </Link>
                                    </Button>
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
                                <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                                <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
                            </div>
                        </div>

                        {/* Clinical Disclaimer */}
                        <div className="mt-8 p-4 rounded-xl bg-muted/30 border border-border/50">
                            <p className="text-xs text-muted-foreground text-center">
                                <strong>Clinical Disclaimer:</strong> HealthMesh provides clinical decision support tools designed to assist healthcare professionals.
                                Our platform does not replace clinical judgment. All AI-generated insights require clinician review and verification.
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
