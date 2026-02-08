import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    url?: string;
    type?: 'website' | 'article' | 'product';
    noindex?: boolean;
}

// Default SEO values
const defaults = {
    title: 'HealthMesh | AI-Powered Clinical Decision Support',
    description: 'Enterprise healthcare AI platform providing explainable clinical decision support, medication safety, and FHIR interoperability. HIPAA compliant.',
    keywords: 'clinical decision support, healthcare AI, medication safety, FHIR, HIPAA compliant',
    image: 'https://healthmesh.azurewebsites.net/og-image.png',
    baseUrl: 'https://healthmesh.azurewebsites.net',
};

/**
 * SEO Component - Updates document head with meta tags
 * Use this on each page to set page-specific SEO
 */
export function SEO({
    title,
    description,
    keywords,
    image,
    url,
    type = 'website',
    noindex = false
}: SEOProps) {
    const [location] = useLocation();

    useEffect(() => {
        // Update title
        const fullTitle = title
            ? `${title} | HealthMesh`
            : defaults.title;
        document.title = fullTitle;

        // Update meta tags
        updateMetaTag('description', description || defaults.description);
        updateMetaTag('keywords', keywords || defaults.keywords);
        updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');

        // Open Graph
        updateMetaTag('og:title', fullTitle, 'property');
        updateMetaTag('og:description', description || defaults.description, 'property');
        updateMetaTag('og:image', image || defaults.image, 'property');
        updateMetaTag('og:url', url || `${defaults.baseUrl}${location}`, 'property');
        updateMetaTag('og:type', type, 'property');

        // Twitter
        updateMetaTag('twitter:title', fullTitle, 'name');
        updateMetaTag('twitter:description', description || defaults.description, 'name');
        updateMetaTag('twitter:image', image || defaults.image, 'name');

        // Canonical
        updateLink('canonical', url || `${defaults.baseUrl}${location}`);

    }, [title, description, keywords, image, url, type, noindex, location]);

    return null; // This component doesn't render anything
}

// Helper to update meta tags
function updateMetaTag(name: string, content: string, attribute: 'name' | 'property' = 'name') {
    let meta = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;

    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
    }

    meta.content = content;
}

// Helper to update link tags
function updateLink(rel: string, href: string) {
    let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;

    if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
    }

    link.href = href;
}

/**
 * Page-specific SEO configurations
 * Import and use these for consistent SEO across pages
 */
export const pageSEO = {
    dashboard: {
        title: 'Clinical Dashboard',
        description: 'AI-powered clinical dashboard for healthcare decision support. Monitor patients, analyze cases, and receive intelligent alerts.',
        noindex: true, // Protected page
    },
    cases: {
        title: 'Clinical Cases',
        description: 'Manage and analyze clinical cases with AI-powered decision support and evidence-based recommendations.',
        noindex: true,
    },
    patients: {
        title: 'Patient Management',
        description: 'Comprehensive patient management with AI analysis, vitals tracking, and clinical decision support.',
        noindex: true,
    },
    login: {
        title: 'Sign In',
        description: 'Sign in to HealthMesh clinical decision support platform. Enterprise healthcare AI for authorized medical professionals.',
        noindex: false, // Public page
    },
    solutions: {
        title: 'Solutions',
        description: 'Explore HealthMesh healthcare AI solutions: clinical decision support, medication safety, lab analysis, and more.',
        keywords: 'healthcare solutions, clinical AI, hospital software, medical decision support',
    },
    medicationSafety: {
        title: 'Medication Safety AI',
        description: 'AI-powered medication safety system detecting drug interactions, contraindications, and dosing errors in real-time.',
        keywords: 'medication safety, drug interactions, adverse drug events, patient safety',
        noindex: true,
    },
    labTrends: {
        title: 'Lab Trend Analysis',
        description: 'Intelligent lab result interpretation with trend analysis and clinical correlation for better patient outcomes.',
        keywords: 'lab interpretation, trend analysis, clinical pathology, diagnostic AI',
        noindex: true,
    },
    earlyDeterioration: {
        title: 'Early Deterioration Detection',
        description: 'AI early warning system for patient deterioration, enabling proactive intervention and improved outcomes.',
        keywords: 'early warning system, patient deterioration, NEWS score, clinical alerts',
        noindex: true,
    },
};

export default SEO;
