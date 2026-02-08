/**
 * About Page
 * 
 * SEO-optimized about/company page for HealthMesh
 * Public page - indexed by search engines
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import {
    HeartPulse,
    ArrowRight,
    Users,
    Target,
    Shield,
    Award,
    Lightbulb,
    Heart,
    Globe,
    GraduationCap,
    Building,
    Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Team values
const values = [
    {
        icon: Heart,
        title: "Patient First",
        description: "Every feature we build is designed with patient safety and outcomes as the primary goal.",
    },
    {
        icon: Shield,
        title: "Trust & Transparency",
        description: "We believe AI in healthcare must be explainable. Every recommendation can be traced to its source.",
    },
    {
        icon: GraduationCap,
        title: "Evidence-Based",
        description: "Our AI is grounded in peer-reviewed research, clinical guidelines, and real-world evidence.",
    },
    {
        icon: Users,
        title: "Clinician-Centric",
        description: "We design alongside physicians, nurses, and pharmacists to ensure our tools fit clinical workflows.",
    },
    {
        icon: Lightbulb,
        title: "Innovation",
        description: "We push the boundaries of what's possible in healthcare AI while maintaining rigorous safety standards.",
    },
    {
        icon: Globe,
        title: "Accessibility",
        description: "Our mission is to make world-class clinical decision support accessible to healthcare providers everywhere.",
    },
];

// Milestones
const milestones = [
    { year: "2023", event: "HealthMesh founded with a mission to transform clinical decision support" },
    { year: "2024", event: "Launched multi-agent AI platform with FHIR R4 integration" },
    { year: "2024", event: "Achieved HIPAA compliance and SOC 2 Type II certification" },
    { year: "2025", event: "Deployed in 50+ healthcare facilities across North America" },
    { year: "2026", event: "Expanded to international markets and launched early deterioration detection" },
];

// Certifications
const certifications = [
    { name: "HIPAA", description: "Health Insurance Portability and Accountability Act compliance" },
    { name: "SOC 2 Type II", description: "Service Organization Control audit certification" },
    { name: "ISO 27001", description: "Information security management certification" },
    { name: "FHIR R4", description: "Fast Healthcare Interoperability Resources standard" },
];

export default function AboutPage() {
    return (
        <>
            <SEO
                title="About HealthMesh | Healthcare AI Company"
                description="Learn about HealthMesh, the team behind AI-powered clinical decision support. Our mission is to empower healthcare professionals with explainable, evidence-based AI."
                keywords="HealthMesh company, healthcare AI company, clinical decision support company, healthcare technology, medical AI startup"
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
                            <Building className="h-3 w-3 mr-1" />
                            Our Story
                        </Badge>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                            Transforming Healthcare with
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400">
                                Responsible AI
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                            We're building the future of clinical decision support — where AI augments human expertise,
                            not replaces it. Our mission is to help healthcare professionals deliver safer,
                            more informed patient care through explainable, evidence-based AI.
                        </p>
                    </div>
                </section>

                {/* Mission & Vision */}
                <section className="py-16 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="rounded-2xl opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                                <CardContent className="p-8">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                                        <Target className="h-6 w-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        To empower healthcare professionals with AI-powered clinical decision support
                                        that is transparent, evidence-based, and designed to enhance — not replace —
                                        clinical judgment. We believe that the best healthcare outcomes come from
                                        combining human expertise with cutting-edge technology.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                                <CardContent className="p-8">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 mb-4">
                                        <Lightbulb className="h-6 w-6 text-teal-400" />
                                    </div>
                                    <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
                                    <p className="text-muted-foreground leading-relaxed">
                                        A world where every healthcare provider has access to the same level of
                                        clinical decision support that was once available only to major academic
                                        medical centers. Where AI helps reduce medical errors, accelerate diagnoses,
                                        and improve patient outcomes at every point of care.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* Values */}
                <section className="py-24 px-6 bg-muted/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                <Heart className="h-3 w-3 mr-1" />
                                Our Values
                            </Badge>
                            <h2 className="text-4xl font-bold mb-4">
                                What Drives <span className="text-primary">HealthMesh</span>
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                These principles guide every decision we make, from product design to patient safety.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {values.map((value, i) => (
                                <Card
                                    key={value.title}
                                    className="rounded-2xl card-hover-subtle opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                                            <value.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {value.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Timeline */}
                <section className="py-24 px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                <Award className="h-3 w-3 mr-1" />
                                Our Journey
                            </Badge>
                            <h2 className="text-4xl font-bold mb-4">
                                Company <span className="text-primary">Milestones</span>
                            </h2>
                        </div>

                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-8 top-0 bottom-0 w-px bg-border" />

                            <div className="space-y-8">
                                {milestones.map((milestone, i) => (
                                    <div
                                        key={i}
                                        className="flex gap-6 opacity-0 animate-slideUp"
                                        style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                    >
                                        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold shrink-0 relative z-10">
                                            {milestone.year}
                                        </div>
                                        <Card className="flex-1 rounded-2xl">
                                            <CardContent className="p-6">
                                                <p className="text-muted-foreground">{milestone.event}</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Certifications */}
                <section className="py-24 px-6 bg-muted/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                <Shield className="h-3 w-3 mr-1" />
                                Compliance
                            </Badge>
                            <h2 className="text-4xl font-bold mb-4">
                                Certifications & <span className="text-primary">Standards</span>
                            </h2>
                            <p className="text-muted-foreground max-w-2xl mx-auto">
                                We maintain the highest standards of security and compliance for healthcare organizations.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {certifications.map((cert, i) => (
                                <Card
                                    key={cert.name}
                                    className="rounded-2xl text-center opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="py-8">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 text-white mx-auto mb-4">
                                            <Award className="h-7 w-7" />
                                        </div>
                                        <h3 className="font-bold text-lg mb-2">{cert.name}</h3>
                                        <p className="text-sm text-muted-foreground">{cert.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-24 px-6">
                    <div className="max-w-4xl mx-auto">
                        <Card className="rounded-3xl bg-gradient-to-br from-primary/10 to-teal-500/10 border-primary/20">
                            <CardContent className="p-12 text-center">
                                <h2 className="text-4xl font-bold mb-4">
                                    Join Us in Shaping the Future of Healthcare
                                </h2>
                                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                    Whether you're looking to implement AI-powered clinical decision support
                                    or join our team, we'd love to hear from you.
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
                                            View Careers
                                        </a>
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
                                <Link href="/solutions" className="hover:text-foreground transition-colors">Solutions</Link>
                                <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
