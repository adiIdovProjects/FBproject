export const landingPageData = {
    hero: {
        headline: "Stop Wasting Money on Ads You Don't Understand",
        subheadline: "Get AI-powered insights in plain English. Average users improve ROAS by 2.3x and save $18,000/year vs agencies.",
        cta: "Start Free Trial",
        trustBadges: [
            { text: "7-Day Free Trial", icon: "check_circle" },
            { text: "No Credit Card Required", icon: "credit_card_off" },
            { text: "Starting at $25/month", icon: "payments" }
        ],
        platformImages: [
            "https://images.unsplash.com/photo-1551288049-bbda48652ad8?auto=format&fit=crop&q=80&w=2070",
            "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2015",
            "https://images.unsplash.com/photo-1543286386-2e659306cd6c?auto=format&fit=crop&q=80&w=2070"
        ]
    },
    howItWorks: {
        title: "Everything You Need. One Platform.",
        subtitle: "No more juggling tools. Connect, analyze, optimize, and report — all without leaving the platform.",
        steps: [
            {
                title: "Connect in Seconds",
                description: "Link your Facebook Ads Manager with one click. Your data syncs automatically and stays up-to-date in real-time.",
                icon: "link"
            },
            {
                title: "AI-Powered Insights (Save 8+ Hours/Week)",
                description: "Ask questions in plain English. Get instant answers about your campaigns — no data analysis degree needed.",
                icon: "psychology"
            },
            {
                title: "Optimize & Grow (Typical ROAS: 2.3x)",
                description: "Track results in real-time and get client-ready reports delivered daily. See what's working in seconds, not hours.",
                icon: "rocket_launch"
            }
        ]
    },
    features: {
        title: "Everything You Need to Run Ads Like a Pro",
        subtitle: "No agency required. No marketing degree needed.",
        items: [
            {
                title: "AI Marketing Expert (Available 24/7)",
                description: "Ask questions, get instant answers. Our AI knows your campaigns and metrics better than any consultant.",
                icon: "smart_toy"
            },
            {
                title: "Meta-Certified Best Practices",
                description: "Campaign setup, audience targeting, budget optimization, and ad design — all based on Meta's official playbook.",
                icon: "school"
            },
            {
                title: "Client-Ready Reports (Save 8 Hours/Week)",
                description: "Professional reports with daily updates and weekly summaries delivered to your inbox automatically.",
                icon: "description"
            },
            {
                title: "Complete Analytics Transparency",
                description: "Know exactly where every dollar goes and what it returns. Make confident decisions in seconds, not days.",
                icon: "analytics"
            }
        ]
    },
    testimonials: [
        {
            name: "Sarah J.",
            role: "Small Business Owner",
            content: "Fired my $1,500/month agency after seeing 47% better ROAS in my first 30 days. Now I run my own ads and actually understand what's working.",
            avatar: "https://i.pravatar.cc/150?u=sarah",
            outcome: "+47% ROAS"
        },
        {
            name: "Marcus T.",
            role: "Freelance Consultant",
            content: "Cut my ad management time from 10 hours to 2 hours per week. The AI is like having a marketing expert on call 24/7 — instant answers, no confusion.",
            avatar: "https://i.pravatar.cc/150?u=marcus",
            outcome: "80% Time Saved"
        },
        {
            name: "Elena R.",
            role: "E-commerce Founder",
            content: "Saved $24,000/year by firing my agency. Reduced CPA by 32% in 60 days while cutting reporting time from 5 hours to 5 minutes per week.",
            avatar: "https://i.pravatar.cc/150?u=elena",
            outcome: "$24k Saved"
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
            answer: "Absolutely. We use official Facebook APIs, bank-level encryption (AES-256), and SOC 2 compliance. Your data is never shared or sold."
        },
        {
            question: "What if I get stuck?",
            answer: "Our AI assistant is available 24/7 for instant answers. Need human help? Our support team typically responds within 2 hours via email or live chat."
        },
        {
            question: "How long does it take to see results?",
            answer: "Most users see meaningful insights within 24 hours of connecting their account. Campaign optimization improvements typically show within 7-14 days as the AI learns your data patterns."
        },
        {
            question: "Can I import my existing campaign data?",
            answer: "Yes! When you connect your Facebook Ads account, we automatically sync your last 3 years of campaign history. No manual imports needed."
        },
        {
            question: "What if I'm currently working with an agency?",
            answer: "Many users run AdCaptain alongside their agency for transparency and second opinions. When ready to switch, our AI can help you transition smoothly without losing momentum."
        }
    ],
    agencyComparison: {
        title: "Why Pay Agency Prices?",
        subtitle: "Get better results for a fraction of the cost.",
        items: [
            { feature: "Monthly Cost", agency: "$1,000 - $5,000+", adcaptain: "Starting at $25/month" },
            { feature: "Contract Lock-in", agency: "3-12 months", adcaptain: "Cancel anytime" },
            { feature: "Control", agency: "They decide", adcaptain: "You decide" },
            { feature: "Transparency", agency: "Monthly reports", adcaptain: "Real-time data" },
            { feature: "Response Time", agency: "Days", adcaptain: "Instant AI" },
            { feature: "Typical Results", agency: "2-3 months to see impact", adcaptain: "Insights within 24 hours" },
            { feature: "Your Data", agency: "They control insights & strategy", adcaptain: "You own all data, insights, and strategy" }
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
