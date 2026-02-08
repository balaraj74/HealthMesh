/**
 * Blog Index Page
 * 
 * SEO-optimized blog listing page for HealthMesh
 * Public page - indexed by search engines
 * Critical for content marketing and organic traffic
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import {
    HeartPulse,
    ArrowRight,
    Calendar,
    Clock,
    User,
    BookOpen,
    Search,
    Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Blog categories for filtering
const categories = [
    { name: "All", slug: "all" },
    { name: "Clinical AI", slug: "clinical-ai" },
    { name: "Patient Safety", slug: "patient-safety" },
    { name: "Healthcare Technology", slug: "healthcare-tech" },
    { name: "Compliance", slug: "compliance" },
    { name: "Case Studies", slug: "case-studies" },
];

// Featured blog posts
const featuredPosts = [
    {
        slug: "understanding-clinical-decision-support-systems",
        title: "Understanding Clinical Decision Support Systems: A Complete Guide for 2026",
        excerpt: "Learn how modern CDSS platforms leverage AI to enhance clinical decision-making, reduce medical errors, and improve patient outcomes in healthcare settings.",
        category: "Clinical AI",
        author: "Dr. Sarah Chen",
        authorRole: "Chief Medical Officer",
        date: "February 5, 2026",
        readTime: "12 min read",
        image: null, // Would be actual image in production
        featured: true,
    },
    {
        slug: "reducing-adverse-drug-events-with-ai",
        title: "How AI is Reducing Adverse Drug Events by 60%",
        excerpt: "Discover how AI-powered medication safety systems are transforming pharmacy workflows and preventing drug interactions before they happen.",
        category: "Patient Safety",
        author: "Dr. Michael Roberts",
        authorRole: "Clinical Pharmacist",
        date: "February 2, 2026",
        readTime: "8 min read",
        image: null,
        featured: true,
    },
];

// Regular blog posts
const blogPosts = [
    {
        slug: "fhir-interoperability-explained",
        title: "FHIR Interoperability Explained: Connecting Your EHR to AI Systems",
        excerpt: "A technical deep-dive into FHIR R4 standards and how healthcare organizations can leverage them for seamless AI integration.",
        category: "Healthcare Technology",
        author: "James Wilson",
        authorRole: "Solutions Architect",
        date: "January 28, 2026",
        readTime: "10 min read",
    },
    {
        slug: "hipaa-compliance-ai-healthcare",
        title: "HIPAA Compliance in AI Healthcare: What You Need to Know",
        excerpt: "Essential guidelines for implementing AI solutions while maintaining full HIPAA compliance and protecting patient data.",
        category: "Compliance",
        author: "Lisa Park",
        authorRole: "Compliance Officer",
        date: "January 25, 2026",
        readTime: "7 min read",
    },
    {
        slug: "early-warning-systems-critical-care",
        title: "Early Warning Systems in Critical Care: Predicting Patient Deterioration",
        excerpt: "How machine learning models analyze vital signs and lab results to identify at-risk patients hours before clinical deterioration.",
        category: "Clinical AI",
        author: "Dr. Sarah Chen",
        authorRole: "Chief Medical Officer",
        date: "January 20, 2026",
        readTime: "9 min read",
    },
    {
        slug: "case-study-community-hospital-ai",
        title: "Case Study: How Community Hospital Reduced Readmissions by 35%",
        excerpt: "A real-world implementation story of AI-powered clinical decision support in a 200-bed community hospital.",
        category: "Case Studies",
        author: "Rachel Kim",
        authorRole: "Customer Success",
        date: "January 15, 2026",
        readTime: "6 min read",
    },
    {
        slug: "lab-trend-analysis-best-practices",
        title: "Lab Trend Analysis: Best Practices for Clinical Interpretation",
        excerpt: "How intelligent lab interpretation systems help clinicians identify concerning patterns and make faster diagnostic decisions.",
        category: "Clinical AI",
        author: "Dr. Michael Roberts",
        authorRole: "Clinical Pharmacist",
        date: "January 10, 2026",
        readTime: "8 min read",
    },
    {
        slug: "future-of-healthcare-ai-2026",
        title: "The Future of Healthcare AI: Trends to Watch in 2026",
        excerpt: "From generative AI to multi-agent systems, explore the emerging technologies shaping the future of clinical decision support.",
        category: "Healthcare Technology",
        author: "James Wilson",
        authorRole: "Solutions Architect",
        date: "January 5, 2026",
        readTime: "11 min read",
    },
];

// Category badge component
function CategoryBadge({ category }: { category: string }) {
    const colorMap: Record<string, string> = {
        "Clinical AI": "bg-sky-500/10 text-sky-400 border-sky-500/30",
        "Patient Safety": "bg-rose-500/10 text-rose-400 border-rose-500/30",
        "Healthcare Technology": "bg-teal-500/10 text-teal-400 border-teal-500/30",
        "Compliance": "bg-amber-500/10 text-amber-400 border-amber-500/30",
        "Case Studies": "bg-purple-500/10 text-purple-400 border-purple-500/30",
    };

    return (
        <Badge variant="outline" className={cn("text-xs", colorMap[category] || "")}>
            {category}
        </Badge>
    );
}

export default function BlogPage() {
    return (
        <>
            <SEO
                title="Healthcare AI Blog | Clinical Decision Support Insights"
                description="Expert insights on healthcare AI, clinical decision support, patient safety, and healthcare technology. Stay informed with the latest trends and best practices."
                keywords="healthcare AI blog, clinical decision support, patient safety, healthcare technology, medical AI, CDSS, healthcare trends"
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
                <section className="pt-32 pb-12 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                            <BookOpen className="h-3 w-3 mr-1" />
                            HealthMesh Blog
                        </Badge>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                            Insights on
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400">
                                Healthcare AI
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                            Expert articles on clinical decision support, patient safety, healthcare technology,
                            and the future of AI in medicine.
                        </p>
                    </div>
                </section>

                {/* Categories */}
                <section className="py-6 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {categories.map((cat) => (
                                <Button
                                    key={cat.slug}
                                    variant={cat.slug === "all" ? "default" : "outline"}
                                    size="sm"
                                    className="rounded-full"
                                >
                                    {cat.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Featured Posts */}
                <section className="py-12 px-6">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8">Featured Articles</h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            {featuredPosts.map((post, i) => (
                                <Card
                                    key={post.slug}
                                    className="rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300 opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    {/* Image placeholder */}
                                    <div className="h-48 bg-gradient-to-br from-primary/20 to-teal-500/20 flex items-center justify-center">
                                        <BookOpen className="h-12 w-12 text-primary/50" />
                                    </div>
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <CategoryBadge category={post.category} />
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {post.date}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="text-sm">
                                                    <p className="font-medium">{post.author}</p>
                                                    <p className="text-xs text-muted-foreground">{post.readTime}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="group-hover:text-primary">
                                                Read More
                                                <ArrowRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* All Posts */}
                <section className="py-12 px-6 bg-muted/20">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold mb-8">Latest Articles</h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {blogPosts.map((post, i) => (
                                <Card
                                    key={post.slug}
                                    className="rounded-2xl group hover:shadow-lg transition-all duration-300 opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <CategoryBadge category={post.category} />
                                        </div>
                                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {post.author}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {post.readTime}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Load More */}
                        <div className="text-center mt-12">
                            <Button variant="outline" size="lg">
                                Load More Articles
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Newsletter CTA */}
                <section className="py-24 px-6">
                    <div className="max-w-4xl mx-auto">
                        <Card className="rounded-3xl bg-gradient-to-br from-primary/10 to-teal-500/10 border-primary/20">
                            <CardContent className="p-12 text-center">
                                <h2 className="text-3xl font-bold mb-4">
                                    Stay Updated on Healthcare AI
                                </h2>
                                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                    Get the latest insights on clinical decision support, patient safety,
                                    and healthcare technology delivered to your inbox.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                    />
                                    <Button size="lg" className="glow-cta whitespace-nowrap">
                                        Subscribe
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-4">
                                    No spam. Unsubscribe anytime. HIPAA compliant communications.
                                </p>
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
