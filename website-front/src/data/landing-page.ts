export const landingPageData = {
    hero: {
        headline: "Stop Paying Agencies. Start Running Your Own Ads.",
        subheadline: "The all-in-one platform that makes Facebook advertising simple. AI-powered insights, guided recommendations, and professional reports — no marketing degree required.",
        cta: "Start Free Trial",
        trustBadges: [
            { text: "7-Day Free Trial", icon: "check_circle" },
            { text: "No Credit Card Required", icon: "credit_card_off" },
            { text: "Starting at $25/month", icon: "payments" }
        ],
        // Platform preview images for rotation
        platformImages: [
            "https://images.unsplash.com/photo-1551288049-bbda48652ad8?auto=format&fit=crop&q=80&w=2070", // Dashboard/Charts
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2015", // Reports/Data
            "https://images.unsplash.com/photo-1543286386-2e659306cd6c?auto=format&fit=crop&q=80&w=2070"  // Insights/Analysis
        ]
    },
    howItWorks: {
        title: "How It Works",
        subtitle: "Take control of your Facebook ads in three simple steps.",
        steps: [
            {
                title: "Connect Your Account",
                description: "Securely link your Facebook Ads Manager in one click. We only read data to generate your insights.",
                icon: "api"
            },
            {
                title: "Get Guided Insights",
                description: "Our AI analyzes your campaigns and tells you exactly what's working, what's not, and what to do next.",
                icon: "auto_awesome"
            },
            {
                title: "Optimize & Report",
                description: "Make data-driven decisions with clear recommendations. Get daily summaries and weekly email reports.",
                icon: "trending_up"
            }
        ]
    },
    features: {
        title: "Everything You Need to Run Ads Like a Pro",
        subtitle: "No agency required. No marketing degree needed.",
        items: [
            {
                title: "AI That Knows Your Data",
                description: "Ask questions, get answers. Our AI assistant knows all your metrics and can explain what they mean.",
                icon: "smart_toy"
            },
            {
                title: "Facebook Expert Built-In",
                description: "Best practices, recommendations, and implementation guides based on Meta's official playbook.",
                icon: "school"
            },
            {
                title: "One-Click Reports",
                description: "Professional client-ready reports. Daily updates, weekly summaries delivered to your inbox.",
                icon: "description"
            },
            {
                title: "All Your Analytics",
                description: "Every metric, every breakdown. See exactly where your money goes and what it brings back.",
                icon: "analytics"
            }
        ]
    },
    testimonials: [
        {
            name: "Sarah J.",
            role: "Small Business Owner",
            content: "I was paying an agency $1,500/month and had no idea what they were doing. Now I run my own ads and actually understand my results.",
            avatar: "https://i.pravatar.cc/150?u=sarah"
        },
        {
            name: "Marcus T.",
            role: "Freelance Consultant",
            content: "The AI assistant is like having a marketing expert on call 24/7. I ask questions and get real answers about my campaigns.",
            avatar: "https://i.pravatar.cc/150?u=marcus"
        },
        {
            name: "Elena R.",
            role: "E-commerce Founder",
            content: "Finally fired my agency. This platform shows me everything I need and the weekly reports save me hours every week.",
            avatar: "https://i.pravatar.cc/150?u=elena"
        }
    ],
    faq: [
        {
            question: "Do I need marketing experience?",
            answer: "Not at all! Our AI guides you step by step. Ask any question about your campaigns and get clear, actionable answers."
        },
        {
            question: "How is this different from an agency?",
            answer: "You keep full control of your ads, pay 10x less, and there are no lock-in contracts. Cancel anytime. Plus, you actually understand what's happening with your money."
        },
        {
            question: "Is my data secure?",
            answer: "Absolutely. We use official Facebook APIs and industry-standard encryption. Your data is never shared with anyone."
        },
        {
            question: "What if I get stuck?",
            answer: "Our AI assistant is available 24/7 to answer your questions. Plus, you can reach our support team via email anytime."
        }
    ],
    agencyComparison: {
        title: "Why Pay Agency Prices?",
        subtitle: "Get better results for a fraction of the cost.",
        items: [
            { feature: "Monthly Cost", agency: "$1,000 - $5,000+", adsai: "Starting at $25/month" },
            { feature: "Contract Lock-in", agency: "3-12 months", adsai: "Cancel anytime" },
            { feature: "Control", agency: "They decide", adsai: "You decide" },
            { feature: "Transparency", agency: "Monthly reports", adsai: "Real-time data" },
            { feature: "Response Time", agency: "Days", adsai: "Instant AI" },
            { feature: "Your Data", agency: "They own insights", adsai: "You own everything" }
        ]
    },
    pricingTiers: [
        { maxSpend: 2000, price: 25, credits: 75 },
        { maxSpend: 5000, price: 40, credits: 100 },
        { maxSpend: 10000, price: 60, credits: 250 },
        { maxSpend: 20000, price: 75, credits: 500 },
        { maxSpend: 50000, price: 95, credits: 1000 },
        { maxSpend: 100000, price: 165, credits: "Custom" },
        { maxSpend: Infinity, price: "Contact", credits: "Custom" }
    ],
    pricingFeatures: [
        "7-day free trial (no credit card)",
        "All analytics & breakdowns",
        "Daily & weekly email reports",
        "AI assistant (credits per tier)",
        "Full platform access"
    ]
};
