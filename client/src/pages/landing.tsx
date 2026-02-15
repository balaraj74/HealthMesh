/**
 * Public Landing Page — HealthMesh
 *
 * Premium animated landing page with:
 *   • Professional text animations (typewriter, fade-up, stagger)
 *   • Glassmorphic design elements
 *   • Hospital / clinical healthcare theme
 *   • Floating medical icon animations
 *   • Scroll-reveal sections
 *   • Interactive dashboard preview
 *
 * SEO-optimized marketing homepage
 */

import { Link } from "wouter";
import { lazy, Suspense, useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation, useInView, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
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
    Sparkles,
    Pill,
    Heart,
    Microscope,
    Syringe,
    Thermometer,
    Eye,
    FileHeart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy-load the heavy dashboard preview
const InteractiveDashboardPreview = lazy(() =>
    import("@/components/interactive-dashboard-preview").then((m) => ({
        default: m.InteractiveDashboardPreview,
    }))
);

/* ─────────────── Data ─────────────── */

const features = [
    {
        icon: Brain,
        title: "AI-Powered Decision Support",
        description:
            "Multi-agent AI system that analyses patient data, research & guidelines to deliver evidence-based clinical recommendations.",
        color: "text-sky-400",
        bgColor: "bg-sky-500/10",
        borderColor: "border-sky-500/20",
        glowColor: "shadow-sky-500/10",
    },
    {
        icon: Shield,
        title: "Medication Safety",
        description:
            "Real-time detection of drug interactions, contra-indications & dosing errors to prevent adverse drug events.",
        color: "text-rose-400",
        bgColor: "bg-rose-500/10",
        borderColor: "border-rose-500/20",
        glowColor: "shadow-rose-500/10",
    },
    {
        icon: FlaskConical,
        title: "Lab Trend Analysis",
        description:
            "Intelligent interpretation of laboratory results with trend analysis and clinical correlation.",
        color: "text-teal-400",
        bgColor: "bg-teal-500/10",
        borderColor: "border-teal-500/20",
        glowColor: "shadow-teal-500/10",
    },
    {
        icon: AlertTriangle,
        title: "Early Deterioration Detection",
        description:
            "AI early-warning system that identifies patients at risk of clinical deterioration before it happens.",
        color: "text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        glowColor: "shadow-amber-500/10",
    },
    {
        icon: Activity,
        title: "Explainable AI",
        description:
            "Every recommendation comes with transparent reasoning, evidence citations & confidence scores.",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        glowColor: "shadow-emerald-500/10",
    },
    {
        icon: Globe,
        title: "FHIR Interoperability",
        description:
            "Seamless integration with existing EHR systems through FHIR R4 standards.",
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        glowColor: "shadow-blue-500/10",
    },
];

const stats = [
    { value: "60%", label: "Reduction in ADEs", icon: Shield },
    { value: "45%", label: "Faster Diagnoses", icon: Zap },
    { value: "99.9%", label: "Uptime SLA", icon: Activity },
    { value: "HIPAA", label: "Compliant", icon: Lock },
];

const trustBadges = [
    "HIPAA Compliant",
    "SOC 2 Type II",
    "FHIR R4 Certified",
    "Enterprise Security",
];

const securityItems = [
    { icon: Lock, title: "HIPAA Compliant", desc: "Full compliance with HIPAA Privacy and Security Rules" },
    { icon: Shield, title: "SOC 2 Type II", desc: "Audited security controls and processes" },
    { icon: Award, title: "ISO 27001", desc: "Information security management certification" },
    { icon: Building2, title: "Enterprise SSO", desc: "Microsoft Entra ID integration for secure access" },
];

/* floating icons for the hero background */
const floatingIcons = [
    { Icon: Heart, x: "10%", y: "20%", size: 24, delay: 0 },
    { Icon: Pill, x: "85%", y: "15%", size: 20, delay: 1.2 },
    { Icon: Stethoscope, x: "75%", y: "70%", size: 22, delay: 0.6 },
    { Icon: Syringe, x: "15%", y: "75%", size: 18, delay: 1.8 },
    { Icon: Microscope, x: "90%", y: "45%", size: 20, delay: 0.3 },
    { Icon: Thermometer, x: "5%", y: "50%", size: 18, delay: 1.5 },
    { Icon: FileHeart, x: "50%", y: "10%", size: 22, delay: 0.9 },
    { Icon: Eye, x: "40%", y: "80%", size: 18, delay: 2.1 },
];

/* ─────────────── Animation helpers ─────────────── */

function useScrollReveal(threshold = 0.15) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: threshold });
    const controls = useAnimation();

    useEffect(() => {
        if (isInView) controls.start("visible");
    }, [isInView, controls]);

    return { ref, controls, isInView };
}

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
    }),
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (i: number = 0) => ({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
    }),
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

/* ─────────────── Typewriter hook ─────────────── */

function useTypewriter(words: string[], typingSpeed = 100, deletingSpeed = 60, pause = 2000) {
    const [text, setText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentWord = words[wordIndex];
        let timeout: ReturnType<typeof setTimeout>;

        if (!isDeleting && text === currentWord) {
            timeout = setTimeout(() => setIsDeleting(true), pause);
        } else if (isDeleting && text === "") {
            setIsDeleting(false);
            setWordIndex((prev) => (prev + 1) % words.length);
        } else {
            timeout = setTimeout(
                () => {
                    setText(
                        isDeleting
                            ? currentWord.substring(0, text.length - 1)
                            : currentWord.substring(0, text.length + 1)
                    );
                },
                isDeleting ? deletingSpeed : typingSpeed
            );
        }

        return () => clearTimeout(timeout);
    }, [text, wordIndex, isDeleting, words, typingSpeed, deletingSpeed, pause]);

    return text;
}

/* ─────────────── Particle Background ─────────────── */

function ParticleField() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Gradient orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-primary/8 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] bg-teal-500/8 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
            <div className="absolute top-[40%] right-[20%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] bg-sky-400/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "4s" }} />

            {/* floating medical icons */}
            {floatingIcons.map(({ Icon, x, y, size, delay }, idx) => (
                <motion.div
                    key={idx}
                    className="absolute text-primary/10"
                    style={{ left: x, top: y }}
                    animate={{
                        y: [0, -20, 0, 20, 0],
                        rotate: [0, 5, 0, -5, 0],
                        opacity: [0.08, 0.15, 0.08],
                    }}
                    transition={{ duration: 8 + idx * 0.5, repeat: Infinity, delay, ease: "easeInOut" }}
                >
                    <Icon size={size} />
                </motion.div>
            ))}

            {/* Grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(56,189,248,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,.3) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />
        </div>
    );
}

/* ─────────────── Glassmorphic Card ─────────────── */

function GlassCard({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl",
                "dark:bg-white/[0.03] dark:border-white/[0.08]",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

/* ─────────────── Animated Counter ─────────────── */

function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });
    const numericValue = parseInt(value.replace(/[^0-9]/g, ""), 10);
    const isNumeric = !isNaN(numericValue);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!isInView || !isNumeric) return;
        let start = 0;
        const end = numericValue;
        const duration = 1600;
        const steps = 60;
        const inc = end / steps;
        const interval = setInterval(() => {
            start += inc;
            if (start >= end) {
                setCount(end);
                clearInterval(interval);
            } else {
                setCount(Math.floor(start));
            }
        }, duration / steps);
        return () => clearInterval(interval);
    }, [isInView, isNumeric, numericValue]);

    return (
        <span ref={ref}>
            {isNumeric ? `${count}${suffix}` : value}
        </span>
    );
}

/* ─────────────── Pulse Ring ─────────────── */

function PulseRing() {
    return (
        <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
        </span>
    );
}

/* ════════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════════ */

export default function LandingPage() {
    const typedWord = useTypewriter(
        ["Clinical Decisions", "Patient Safety", "Drug Interactions", "Lab Analysis", "Early Warnings"],
        90,
        50,
        2200
    );

    /* scroll-reveal refs */
    const statsReveal = useScrollReveal();
    const featuresReveal = useScrollReveal();
    const securityReveal = useScrollReveal();
    const ctaReveal = useScrollReveal();

    return (
        <>
            <SEO
                title="AI-Powered Clinical Decision Support for Healthcare"
                description="HealthMesh is an enterprise healthcare AI platform providing explainable clinical decision support, medication safety, lab analysis, and FHIR interoperability. HIPAA compliant."
                keywords="clinical decision support system, healthcare AI, medication safety, drug interaction checker, FHIR, HIPAA compliant, hospital AI, patient safety"
            />

            <div className="min-h-screen bg-background overflow-x-hidden">
                {/* ───────── Navigation ───────── */}
                <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-2xl">
                    <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link href="/">
                            <motion.div
                                className="flex items-center gap-3 cursor-pointer group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-400 text-white shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                                    <HeartPulse className="h-5 w-5" />
                                </div>
                                <span className="text-xl font-bold">
                                    Health<span className="text-primary">Mesh</span>
                                </span>
                            </motion.div>
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

                <main>
                    {/* ═══════════ HERO ═══════════ */}
                    <section className="relative pt-32 pb-24 px-6 min-h-screen flex items-center">
                        <ParticleField />

                        <div className="relative z-10 max-w-7xl mx-auto w-full">
                            <div className="text-center max-w-5xl mx-auto">
                                {/* Trust badges */}
                                <motion.div
                                    className="flex flex-wrap justify-center gap-2 mb-8"
                                    initial="hidden"
                                    animate="visible"
                                    variants={staggerContainer}
                                >
                                    {trustBadges.map((badge, i) => (
                                        <motion.div key={badge} variants={fadeUp} custom={i}>
                                            <Badge
                                                variant="outline"
                                                className="text-xs px-3 py-1.5 rounded-full border-primary/30 text-primary bg-primary/5 backdrop-blur-sm"
                                            >
                                                <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                                {badge}
                                            </Badge>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                {/* Headline */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                                        AI-Powered
                                        <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400 bg-[length:200%_auto] animate-gradient">
                                            {typedWord}
                                        </span>
                                        <motion.span
                                            className="inline-block w-[3px] h-[0.9em] bg-primary ml-1 align-middle rounded-sm"
                                            animate={{ opacity: [1, 0, 1] }}
                                            transition={{ duration: 0.8, repeat: Infinity }}
                                        />
                                    </h1>
                                </motion.div>

                                {/* Sub-headline */}
                                <motion.p
                                    className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.7, delay: 0.5 }}
                                >
                                    Enterprise healthcare AI platform that empowers clinicians with{" "}
                                    <strong className="text-foreground">
                                        explainable, evidence-based recommendations
                                    </strong>{" "}
                                    for safer, faster patient care.
                                </motion.p>

                                {/* CTA Buttons */}
                                <motion.div
                                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.7, delay: 0.7 }}
                                >
                                    <Button size="lg" asChild className="glow-cta text-lg px-8 py-6 group">
                                        <Link href="/login">
                                            <Sparkles className="mr-2 h-5 w-5 group-hover:animate-spin" />
                                            Request Demo
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-border/50 backdrop-blur-sm hover:bg-white/5">
                                        <a href="#features">
                                            Explore Features
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </a>
                                    </Button>
                                </motion.div>

                                {/* Live indicator */}
                                <motion.div
                                    className="flex items-center justify-center gap-2 mb-12"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                >
                                    <PulseRing />
                                    <span className="text-xs text-muted-foreground">Trusted by 50+ healthcare organisations worldwide</span>
                                </motion.div>

                                {/* Dashboard Preview — glassmorphic frame */}
                                <motion.div
                                    className="relative"
                                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 1, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                                >
                                    {/* Glow behind */}
                                    <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-sky-400/10 to-teal-400/20 rounded-3xl blur-2xl opacity-60" />

                                    <GlassCard className="relative p-2 md:p-3">
                                        <Suspense
                                            fallback={
                                                <div className="w-full rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 min-h-[300px] flex items-center justify-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                                        <span className="text-sm text-white/50">Loading dashboard…</span>
                                                    </div>
                                                </div>
                                            }
                                        >
                                            <InteractiveDashboardPreview />
                                        </Suspense>
                                    </GlassCard>
                                </motion.div>
                            </div>
                        </div>
                    </section>

                    {/* ═══════════ STATS ═══════════ */}
                    <section className="py-20 px-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
                        <motion.div
                            ref={statsReveal.ref}
                            className="max-w-7xl mx-auto relative z-10"
                            initial="hidden"
                            animate={statsReveal.controls}
                            variants={staggerContainer}
                        >
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {stats.map((stat, i) => (
                                    <motion.div key={stat.label} variants={scaleIn} custom={i}>
                                        <GlassCard className="p-6 text-center group hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:shadow-primary/5">
                                            <stat.icon className="h-8 w-8 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                                                <AnimatedCounter
                                                    value={stat.value}
                                                    suffix={stat.value.includes("%") ? "%" : ""}
                                                />
                                            </div>
                                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                                        </GlassCard>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </section>

                    {/* ═══════════ FEATURES ═══════════ */}
                    <section id="features" className="py-28 px-6 relative">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-32 bg-gradient-to-b from-transparent to-primary/30" />

                        <motion.div
                            ref={featuresReveal.ref}
                            className="max-w-7xl mx-auto"
                            initial="hidden"
                            animate={featuresReveal.controls}
                            variants={staggerContainer}
                        >
                            {/* Section header */}
                            <div className="text-center mb-20">
                                <motion.div variants={fadeUp} custom={0}>
                                    <Badge variant="outline" className="mb-5 text-primary border-primary/30 backdrop-blur-sm px-4 py-1.5">
                                        <Sparkles className="h-3 w-3 mr-1.5" />
                                        Platform Features
                                    </Badge>
                                </motion.div>
                                <motion.h2
                                    className="text-4xl md:text-5xl font-bold mb-5 leading-tight"
                                    variants={fadeUp}
                                    custom={1}
                                >
                                    Everything You Need for
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                                        {" "}
                                        Smarter Clinical Decisions
                                    </span>
                                </motion.h2>
                                <motion.p
                                    className="text-muted-foreground max-w-2xl mx-auto text-lg"
                                    variants={fadeUp}
                                    custom={2}
                                >
                                    Our multi-agent AI system orchestrates specialised agents to deliver comprehensive clinical insights.
                                </motion.p>
                            </div>

                            {/* Feature cards */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {features.map((f, i) => (
                                    <motion.div key={f.title} variants={scaleIn} custom={i}>
                                        <GlassCard
                                            className={cn(
                                                "p-6 h-full group cursor-default transition-all duration-500",
                                                "hover:shadow-2xl hover:-translate-y-1",
                                                `hover:${f.borderColor}`
                                            )}
                                        >
                                            {/* Icon */}
                                            <div
                                                className={cn(
                                                    "flex h-14 w-14 items-center justify-center rounded-2xl border mb-5 transition-transform duration-300 group-hover:scale-110",
                                                    f.bgColor,
                                                    f.borderColor
                                                )}
                                            >
                                                <f.icon className={cn("h-7 w-7", f.color)} />
                                            </div>
                                            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                                        </GlassCard>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </section>

                    {/* ═══════════ SECURITY ═══════════ */}
                    <section id="security" className="py-28 px-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />

                        <motion.div
                            ref={securityReveal.ref}
                            className="max-w-7xl mx-auto relative z-10"
                            initial="hidden"
                            animate={securityReveal.controls}
                        >
                            <div className="grid lg:grid-cols-2 gap-16 items-center">
                                {/* Left text */}
                                <motion.div variants={fadeUp}>
                                    <Badge variant="outline" className="mb-5 text-primary border-primary/30 px-4 py-1.5">
                                        <Lock className="h-3 w-3 mr-1.5" />
                                        Enterprise Security
                                    </Badge>
                                    <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                                        Built for Healthcare
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-400"> Compliance</span>
                                    </h2>
                                    <p className="text-muted-foreground mb-10 text-lg leading-relaxed">
                                        HealthMesh is designed from the ground up with healthcare compliance and security in mind.
                                        Your patient data is protected by enterprise-grade security measures.
                                    </p>

                                    <div className="space-y-5">
                                        {securityItems.map((item, i) => (
                                            <motion.div
                                                key={item.title}
                                                className="flex items-start gap-4 group"
                                                variants={fadeUp}
                                                custom={i + 2}
                                            >
                                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shrink-0 group-hover:scale-110 transition-transform">
                                                    <item.icon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-base mb-0.5">{item.title}</h3>
                                                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* Right glassmorphic card */}
                                <motion.div className="relative" variants={scaleIn} custom={1}>
                                    <div className="absolute -inset-6 bg-gradient-to-r from-primary/15 to-teal-500/15 rounded-[2rem] blur-3xl" />
                                    <GlassCard className="relative p-8">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-sky-400 flex items-center justify-center shadow-lg shadow-primary/30">
                                                <Lock className="h-7 w-7 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">Zero Trust Architecture</h3>
                                                <p className="text-sm text-muted-foreground">Enterprise-grade security</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {[
                                                "End-to-end encryption (AES-256)",
                                                "Role-based access control",
                                                "Complete audit logging",
                                                "Data anonymisation & masking",
                                                "Automated threat detection",
                                            ].map((item, i) => (
                                                <motion.div
                                                    key={item}
                                                    className="flex items-center gap-3"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={securityReveal.isInView ? { opacity: 1, x: 0 } : {}}
                                                    transition={{ delay: 0.5 + i * 0.1 }}
                                                >
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                                                    <span className="text-sm">{item}</span>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Mini status bar */}
                                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <PulseRing />
                                                <span className="text-xs text-muted-foreground">All systems operational</span>
                                            </div>
                                            <span className="text-xs text-emerald-400">100% Uptime</span>
                                        </div>
                                    </GlassCard>
                                </motion.div>
                            </div>
                        </motion.div>
                    </section>

                    {/* ═══════════ CTA ═══════════ */}
                    <section className="py-28 px-6 relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.04] to-transparent" />
                        <motion.div
                            ref={ctaReveal.ref}
                            className="max-w-4xl mx-auto text-center relative z-10"
                            initial="hidden"
                            animate={ctaReveal.controls}
                            variants={staggerContainer}
                        >
                            <motion.h2
                                className="text-4xl md:text-5xl font-bold mb-6 leading-tight"
                                variants={fadeUp}
                                custom={0}
                            >
                                Ready to Transform Your
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-400">
                                    {" "}
                                    Clinical Workflow?
                                </span>
                            </motion.h2>
                            <motion.p
                                className="text-muted-foreground mb-10 max-w-2xl mx-auto text-lg"
                                variants={fadeUp}
                                custom={1}
                            >
                                Join leading healthcare organisations using HealthMesh to improve patient outcomes and support clinical decision-making with AI.
                            </motion.p>
                            <motion.div
                                className="flex flex-col sm:flex-row items-center justify-center gap-4"
                                variants={fadeUp}
                                custom={2}
                            >
                                <Button size="lg" asChild className="glow-cta text-lg px-8 py-6">
                                    <Link href="/login">
                                        <Stethoscope className="mr-2 h-5 w-5" />
                                        Request Demo
                                    </Link>
                                </Button>
                                <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6 border-border/50 backdrop-blur-sm">
                                    <a href="mailto:balarajr483@gmail.com">Contact Sales</a>
                                </Button>
                            </motion.div>
                        </motion.div>
                    </section>
                </main>

                {/* ═══════════ FOOTER ═══════════ */}
                <footer className="border-t border-border/30 py-16 px-6 relative">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-4 gap-10 mb-10">
                            {/* Brand */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-sky-400 text-white">
                                        <HeartPulse className="h-4 w-4" />
                                    </div>
                                    <span className="text-lg font-bold">HealthMesh</span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    AI-Powered Clinical Decision Support for Healthcare
                                </p>
                            </div>

                            <div>
                                <p className="font-semibold mb-4">Solutions</p>
                                <ul className="space-y-2.5 text-sm text-muted-foreground">
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Clinical Decision Support</Link></li>
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Medication Safety</Link></li>
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Lab Interpretation</Link></li>
                                    <li><Link href="/solutions" className="hover:text-foreground transition-colors">Early Deterioration</Link></li>
                                </ul>
                            </div>

                            <div>
                                <p className="font-semibold mb-4">Company</p>
                                <ul className="space-y-2.5 text-sm text-muted-foreground">
                                    <li><Link href="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                                    <li><Link href="/about" className="hover:text-foreground transition-colors">Careers</Link></li>
                                    <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                                    <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                                </ul>
                            </div>

                            <div>
                                <p className="font-semibold mb-4">Compliance</p>
                                <ul className="space-y-2.5 text-sm text-muted-foreground">
                                    <li><a href="#security" className="hover:text-foreground transition-colors">HIPAA</a></li>
                                    <li><a href="#security" className="hover:text-foreground transition-colors">Security</a></li>
                                    <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                                    <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-t border-border/30 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                © 2026 HealthMesh. All rights reserved. HIPAA Compliant • SOC 2 Type II
                            </p>
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="text-xs backdrop-blur-sm">
                                    <Shield className="h-3 w-3 mr-1" />
                                    HIPAA
                                </Badge>
                                <Badge variant="outline" className="text-xs backdrop-blur-sm">
                                    <Award className="h-3 w-3 mr-1" />
                                    SOC 2
                                </Badge>
                            </div>
                        </div>

                        {/* Clinical Disclaimer */}
                        <GlassCard className="mt-10 p-5">
                            <p className="text-xs text-muted-foreground text-center leading-relaxed">
                                <strong>Clinical Disclaimer:</strong> HealthMesh provides clinical decision support tools designed to assist
                                healthcare professionals. Our platform does not replace clinical judgment. All AI-generated insights require
                                clinician review and verification. This content is for informational purposes only and does not constitute
                                medical advice.
                            </p>
                        </GlassCard>
                    </div>
                </footer>
            </div>
        </>
    );
}
