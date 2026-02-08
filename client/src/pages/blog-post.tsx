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
import { BLOG_POSTS } from "@/data/blog-posts";
import NotFound from "./not-found";

// Helper to find post
function getPost(slug: string) {
    const post = BLOG_POSTS.find(p => p.slug === slug);
    if (post) return post;

    // Fallback not strictly needed if we assume link integrity, 
    // but useful for direct URL navigation to bad slugs.
    // However, NotFound component should handle this if we return null.
    return null;
}

export default function BlogPostPage() {
    const [match, params] = useRoute("/blog/:slug");

    if (!match || !params) return <NotFound />;

    const post = getPost(params.slug);

    if (!post) return <NotFound />;

    // Generate Article structured data for SEO
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "author": {
            "@type": "Person",
            "name": post.author,
            "jobTitle": post.authorRole
        },
        "publisher": {
            "@type": "Organization",
            "name": "HealthMesh",
            "logo": {
                "@type": "ImageObject",
                "url": "https://healthmesh.azurewebsites.net/logo.png"
            }
        },
        "datePublished": post.date,
        "dateModified": post.date,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://healthmesh.azurewebsites.net/blog/${post.slug}`
        },
        "articleSection": post.category,
        "keywords": `healthcare AI, ${post.category.toLowerCase()}, clinical decision support`
    };

    return (
        <>
            <SEO
                title={`${post.title} | HealthMesh Blog`}
                description={post.excerpt}
                keywords={`healthcare AI, ${post.category.toLowerCase()}, healthmesh blog`}
                type="article"
            />

            {/* Article Structured Data for Rich Search Results */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
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
