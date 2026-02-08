/**
 * Contact Page
 * 
 * SEO-optimized contact page for HealthMesh
 * Public page - indexed by search engines
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/seo";
import {
    HeartPulse,
    ArrowRight,
    Mail,
    Phone,
    MapPin,
    Clock,
    MessageSquare,
    Building2,
    Stethoscope,
    Users,
    HelpCircle,
    BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Contact options
const contactOptions = [
    {
        icon: Stethoscope,
        title: "Sales & Demos",
        description: "Get a personalized demo of HealthMesh for your organization",
        email: "balarajr483@gmail.com",
        phone: "+91 8431206594",
        responseTime: "Within 24 hours",
    },
    {
        icon: HelpCircle,
        title: "Technical Support",
        description: "Get help with implementation, integrations, or technical issues",
        email: "balarajr483@gmail.com",
        phone: "+91 8431206594",
        responseTime: "Within 4 hours (Priority)",
    },
    {
        icon: Users,
        title: "Partnerships",
        description: "Explore partnership opportunities with HealthMesh",
        email: "balarajr483@gmail.com",
        phone: "+91 8431206594",
        responseTime: "Within 48 hours",
    },
];

// Office locations
const offices = [
    {
        city: "San Francisco",
        address: "100 Market Street, Suite 300",
        state: "CA 94104",
        type: "Headquarters",
    },
    {
        city: "Boston",
        address: "200 Longwood Avenue",
        state: "MA 02115",
        type: "Clinical Operations",
    },
    {
        city: "Austin",
        address: "500 Congress Avenue, Suite 600",
        state: "TX 78701",
        type: "Engineering Hub",
    },
];

export default function ContactPage() {
    return (
        <>
            <SEO
                title="Contact HealthMesh | Healthcare AI Support & Sales"
                description="Contact HealthMesh for sales demos, technical support, or partnership inquiries. Get in touch with our healthcare AI team today."
                keywords="contact HealthMesh, healthcare AI support, clinical decision support demo, healthcare technology sales"
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
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Contact Us
                        </Badge>
                        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 opacity-0 animate-slideUp" style={{ animationFillMode: 'forwards' }}>
                            Get in Touch with
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-sky-400 to-teal-400">
                                HealthMesh
                            </span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto opacity-0 animate-slideUp" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                            Ready to transform your clinical workflow? Our team is here to help you get started
                            with AI-powered clinical decision support.
                        </p>
                    </div>
                </section>

                {/* Contact Options */}
                <section className="py-16 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            {contactOptions.map((option, i) => (
                                <Card
                                    key={option.title}
                                    className="rounded-2xl opacity-0 animate-slideUp hover:shadow-lg transition-all duration-300"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                                            <option.icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{option.title}</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {option.description}
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <a
                                                href={`mailto:${option.email}`}
                                                className="flex items-center gap-2 text-primary hover:underline"
                                            >
                                                <Mail className="h-4 w-4" />
                                                {option.email}
                                            </a>
                                            <a
                                                href={`tel:${option.phone.replace(/\D/g, '')}`}
                                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                            >
                                                <Phone className="h-4 w-4" />
                                                {option.phone}
                                            </a>
                                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                Response: {option.responseTime}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contact Form */}
                <section className="py-16 px-6 bg-muted/20">
                    <div className="max-w-4xl mx-auto">
                        <Card className="rounded-3xl">
                            <CardHeader className="text-center pb-0">
                                <CardTitle className="text-3xl">Send Us a Message</CardTitle>
                                <p className="text-muted-foreground mt-2">
                                    Fill out the form below and we'll get back to you as soon as possible.
                                </p>
                            </CardHeader>
                            <CardContent className="p-8">
                                <form className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">First Name *</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                                placeholder="John"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Last Name *</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Work Email *</label>
                                            <input
                                                type="email"
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                                placeholder="john.doe@hospital.org"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Phone Number</label>
                                            <input
                                                type="tel"
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                                placeholder="+1 (555) 000-0000"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Organization *</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                                placeholder="Hospital Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-2">Role</label>
                                            <select
                                                className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                            >
                                                <option value="">Select your role</option>
                                                <option value="physician">Physician</option>
                                                <option value="nurse">Nurse</option>
                                                <option value="pharmacist">Pharmacist</option>
                                                <option value="it">IT / Informatics</option>
                                                <option value="executive">Executive</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Inquiry Type *</label>
                                        <select
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
                                        >
                                            <option value="">Select inquiry type</option>
                                            <option value="demo">Request a Demo</option>
                                            <option value="pricing">Pricing Information</option>
                                            <option value="technical">Technical Questions</option>
                                            <option value="partnership">Partnership Inquiry</option>
                                            <option value="support">Support Request</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Message *</label>
                                        <textarea
                                            rows={5}
                                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:outline-none resize-none"
                                            placeholder="Tell us about your needs and how we can help..."
                                        />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            id="consent"
                                            className="mt-1"
                                        />
                                        <label htmlFor="consent" className="text-sm text-muted-foreground">
                                            I agree to receive communications from HealthMesh. We respect your privacy and will never share your information.
                                        </label>
                                    </div>
                                    <Button size="lg" className="w-full glow-cta text-lg py-6">
                                        Send Message
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* Office Locations */}
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <Badge variant="outline" className="mb-4 text-primary border-primary/30">
                                <Building2 className="h-3 w-3 mr-1" />
                                Our Offices
                            </Badge>
                            <h2 className="text-4xl font-bold mb-4">
                                Global <span className="text-primary">Locations</span>
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {offices.map((office, i) => (
                                <Card
                                    key={office.city}
                                    className="rounded-2xl opacity-0 animate-slideUp"
                                    style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                                >
                                    <CardContent className="p-6 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-4">
                                            <MapPin className="h-6 w-6 text-primary" />
                                        </div>
                                        <Badge variant="secondary" className="mb-3">{office.type}</Badge>
                                        <h3 className="text-xl font-bold mb-2">{office.city}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {office.address}<br />
                                            {office.state}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Quick Links */}
                <section className="py-16 px-6 bg-muted/20">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-3 gap-8">
                            <Card className="rounded-2xl hover:shadow-lg transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <BookOpen className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="font-bold mb-2">Documentation</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Browse our technical documentation and API guides.
                                    </p>
                                    <Button variant="outline" size="sm">
                                        View Docs <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl hover:shadow-lg transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <HelpCircle className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="font-bold mb-2">FAQs</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Find answers to commonly asked questions.
                                    </p>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href="/pricing">
                                            View FAQs <ArrowRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="rounded-2xl hover:shadow-lg transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <Users className="h-8 w-8 text-primary mb-4" />
                                    <h3 className="font-bold mb-2">Careers</h3>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Join our team and help transform healthcare.
                                    </p>
                                    <Button variant="outline" size="sm">
                                        View Openings <ArrowRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
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
