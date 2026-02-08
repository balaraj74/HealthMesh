/**
 * Individual Blog Post Page
 * 
 * Renders a single blog post based on the slug parameter.
 */

import { useRoute } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import {
    HeartPulse,
    ArrowLeft,
    Calendar,
    User,
    Clock,
    Share2,
    Linkedin,
    Twitter,
    Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotFound from "./not-found";

// Shared data (duplicated from blog.tsx for now)
const allPosts = [
    {
        slug: "understanding-clinical-decision-support-systems",
        title: "Understanding Clinical Decision Support Systems: A Complete Guide for 2026",
        content: `
            <p class="mb-4">Clinical Decision Support Systems (CDSS) have evolved significantly over the past decade. In 2026, they are no longer just alert-generating engines but sophisticated AI partners that integrate seamlessly into clinical workflows.</p>
            
            <h2 class="text-2xl font-bold mt-8 mb-4">The Evolution of CDSS</h2>
            <p class="mb-4">Traditional CDSS relied on rule-based logic: "IF patient is on Warfarin AND prescribed Aspirin THEN alert." While useful, this approach led to significant alert fatigue, with clinicians overriding up to 90% of alerts.</p>
            <p class="mb-4">Modern AI-driven CDSS, like HealthMesh, uses machine learning to understand context. It considers the patient's full history, current lab values, and specific clinical nuances before making a recommendation.</p>

            <h2 class="text-2xl font-bold mt-8 mb-4">Key Benefits of AI-Powered CDSS</h2>
            <ul class="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Reduced Diagnostic Errors:</strong> AI can identify subtle patterns in lab tests and vitals that humans might miss in a busy setting.</li>
                <li><strong>Personalized Treatment Plans:</strong> Recommendations are tailored to the individual patient's genetic profile and history.</li>
                <li><strong>Workflow Efficiency:</strong> By automating routine checks, clinicians can focus on complex decision-making.</li>
            </ul>

            <h2 class="text-2xl font-bold mt-8 mb-4">Implementing CDSS Successfully</h2>
            <p class="mb-4">Success depends not just on the technology, but on how it's integrated. "The best AI is the one you don't notice until you need it," says Dr. Sarah Chen, our CMO.</p>
            
            <blockquote class="border-l-4 border-primary pl-4 italic my-6 text-xl text-muted-foreground">
                "We must move from 'alerting' to 'advising'. The goal is to be a copilot, not a backseat driver."
            </blockquote>

            <p class="mb-4">As we look to the future, the integration of generative AI will allow for even more natural interactions, where clinicians can ask complex questions and receive evidence-based answers in seconds.</p>
        `,
        excerpt: "Learn how modern CDSS platforms leverage AI to enhance clinical decision-making, reduce medical errors, and improve patient outcomes in healthcare settings.",
        category: "Clinical AI",
        author: "Dr. Sarah Chen",
        authorRole: "Chief Medical Officer",
        date: "February 5, 2026",
        readTime: "12 min read",
    },
    {
        slug: "reducing-adverse-drug-events-with-ai",
        title: "How AI is Reducing Adverse Drug Events by 60%",
        content: `
            <p class="mb-4">Adverse Drug Events (ADEs) remain a leading cause of preventable harm in healthcare. However, new AI capabilities are changing the landscape of medication safety.</p>
            
            <h2 class="text-2xl font-bold mt-8 mb-4">The Scope of the Problem</h2>
            <p class="mb-4">Each year, ADEs account for millions of hospital admissions and billions in excess costs. The complexity of modern pharmacotherapy makes it impossible for any single clinician to memorize every potential interaction.</p>

            <h2 class="text-2xl font-bold mt-8 mb-4">How AI Intervenes</h2>
            <p class="mb-4">Unlike static databases, AI models can predict risk based on dynamic factors:</p>
            <ul class="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Renal Function Changes:</strong> Real-time dose adjustments based on creatine clearance trends.</li>
                <li><strong>Genetic Factors:</strong> Pharmacogenomic screening integrated into the prescribing workflow.</li>
                <li><strong>Cumulative Toxicity:</strong> Monitoring the total anticholinergic burden across multiple medications.</li>
            </ul>

            <p class="mb-4">In recent pilots, HealthMesh's algorithms demonstrated a 60% reduction in serious ADEs by catching meaningful interactions that rule-based systems missed.</p>
        `,
        excerpt: "Discover how AI-powered medication safety systems are transforming pharmacy workflows and preventing drug interactions before they happen.",
        category: "Patient Safety",
        author: "Dr. Michael Roberts",
        authorRole: "Clinical Pharmacist",
        date: "February 2, 2026",
        readTime: "8 min read",
    },
    // Generic fallback for other posts
    {
        slug: "default",
        title: "Detailed Article View",
        content: `
            <p class="mb-4">This is a placeholder for the full article content. In a production environment, this content would be fetched from a CMS or database.</p>
            <p class="mb-4">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            <h2 class="text-2xl font-bold mt-8 mb-4">Key Takeaways</h2>
            <p class="mb-4">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        `,
        excerpt: "Full article content placeholder.",
        category: "General",
        author: "HealthMesh Team",
        authorRole: "Editor",
        date: "January 1, 2026",
        readTime: "5 min read",
    }
];

// Helper to find post
function getPost(slug: string) {
    const post = allPosts.find(p => p.slug === slug);
    if (post) return post;

    // Check if it's one of the other slugs from blog.tsx that we didn't fully flesh out above
    // and return a generic version with the correct slug/title if possible, or just the default
    return {
        ...allPosts[2], // use default
        slug: slug,
        title: slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
    };
}

export default function BlogPostPage() {
    const [match, params] = useRoute("/blog/:slug");

    if (!match || !params) return <NotFound />;

    const post = getPost(params.slug);

    return (
        <>
            <SEO
                title={`${post.title} | HealthMesh Blog`}
                description={post.excerpt}
                keywords={`healthcare AI, ${post.category.toLowerCase()}, healthmesh blog`}
                type="article"
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

                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/blog" className="text-sm font-medium flex items-center gap-2 hover:text-primary transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Blog
                            </Link>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button asChild className="glow-cta">
                                <Link href="/login">Get Started</Link>
                            </Button>
                        </div>
                    </nav>
                </header>

                {/* Article Content */}
                <article className="pt-32 pb-24 px-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                            <div className="flex items-center gap-3 mb-6">
                                <Badge variant="outline" className="text-primary border-primary/30">
                                    {post.category}
                                </Badge>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {post.date}
                                </span>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {post.readTime}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                                {post.title}
                            </h1>

                            <div className="flex items-center justify-between border-b border-border pb-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{post.author}</p>
                                        <p className="text-xs text-muted-foreground">{post.authorRole}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#0A66C2]">
                                        <Linkedin className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#1DA1F2]">
                                        <Twitter className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Content Body */}
                        <div
                            className="prose prose-lg dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground opacity-0 animate-slideUp"
                            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* CTA Box */}
                        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-teal-500/10 border border-primary/20 opacity-0 animate-slideUp" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                            <h3 className="text-2xl font-bold mb-4">Ready to improve patient outcomes?</h3>
                            <p className="text-muted-foreground mb-6">
                                Empower your team with the same AI technology discussed in this article.
                            </p>
                            <Button size="lg" className="glow-cta" asChild>
                                <Link href="/contact">Contact Sales</Link>
                            </Button>
                        </div>
                    </div>
                </article>

                {/* Footer */}
                <footer className="border-t border-border/50 py-12 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <HeartPulse className="h-5 w-5 text-primary" />
                            <span className="font-bold">HealthMesh</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <Link href="/" className="hover:text-foreground">Home</Link>
                            <Link href="/blog" className="hover:text-foreground">Blog</Link>
                            <Link href="/contact" className="hover:text-foreground">Contact</Link>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
