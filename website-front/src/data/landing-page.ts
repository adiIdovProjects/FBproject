export const landingPageData = {
    hero: {
        headline: "Simplify Facebook Data. Gain Valuable Insights.",
        subheadline: "Built by marketers, for marketers. The easy-to-use platform to compare performance, conduct research, and create custom reports.",
        cta: "Connect Now - It's Free",
        trustBadges: [
            { text: "7 Days Free Trial", icon: "check_circle" },
            { text: "Setup in 2 minutes", icon: "bolt" }
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
        subtitle: "Turn raw data into winning strategies in three simple steps.",
        steps: [
            {
                title: "Connect Account",
                description: "Securely link your Facebook Ads Manager in one click. We only read data to generate your insights.",
                icon: "api"
            },
            {
                title: "Find Insights",
                description: "Our AI highlights what's working and what isn't, comparing performance across campaigns and timeframes.",
                icon: "search_insights"
            },
            {
                title: "Custom Reports",
                description: "Generate professional reports and optimization plans tailored to your specific marketing goals.",
                icon: "description"
            }
        ]
    },
    features: {
        title: "Designed for Modern Marketers",
        subtitle: "Everything you need to stop guessing and start growing.",
        items: [
            {
                title: "Performance Comparison",
                description: "Compare your campaigns side-by-side. See which creative, audience, or placement is truly driving ROI.",
                icon: "compare_arrows"
            },
            {
                title: "In-Depth Research",
                description: "Deep dive into historical data to find patterns and trends that standard Meta dashboards hide.",
                icon: "travel_explore"
            },
            {
                title: "AI Optimization",
                description: "Get smart recommendations based on real performance data to maximize your ad spend efficiency.",
                icon: "auto_fix_high"
            },
            {
                title: "Marketer-First UX",
                description: "No complex spreadsheets or confusing menus. Built by marketers who know what data matters most.",
                icon: "account_circle"
            }
        ]
    },
    testimonials: [
        {
            name: "Sarah J.",
            role: "E-commerce Founder",
            content: "Finally, a tool that shows me what I actually need to see. The comparison tool alone saved us 20% on ad spend in the first week.",
            avatar: "https://i.pravatar.cc/150?u=sarah"
        },
        {
            name: "Marcus T.",
            role: "Growth Marketer",
            content: "The custom reports are a game changer. I spend 5 minutes on reporting now instead of 5 hours.",
            avatar: "https://i.pravatar.cc/150?u=marcus"
        },
        {
            name: "Elena R.",
            role: "Agency Director",
            content: "Built by marketers is right. The flow is intuitive and the insights are actually actionable, not just fluff.",
            avatar: "https://i.pravatar.cc/150?u=elena"
        }
    ],
    faq: [
        {
            question: "Is it really free for 7 days?",
            answer: "Yes! You get full access to all features for 7 days. No credit card required to start."
        },
        {
            question: "How secure is my data?",
            answer: "We use official Facebook APIs and industry-standard encryption. We never share your data or spend budget without your permission."
        },
        {
            question: "Can I manage multiple accounts?",
            answer: "Absolutely. Our Agency plan is built specifically for teams managing high-volume accounts."
        }
    ],
    pricing: [
        {
            name: 'Starter',
            price: '0',
            description: 'Perfect for exploring AI insights.',
            features: ['1 Ad Account', 'Basic Reporting', 'Weekly Insights', 'Community Support'],
            cta: 'Start 7-Day Free Trial',
            popular: false,
        },
        {
            name: 'Pro Growth',
            price: '49',
            description: 'For scaling brands and small agencies.',
            features: ['5 Ad Accounts', 'Unlimited AI Insights', 'Real-time Alerts', 'Priority Support', 'Creative Analysis API'],
            cta: 'Get Started',
            popular: true,
        },
        {
            name: 'Agency',
            price: 'Custom',
            description: 'Enterprise-grade features for large teams.',
            features: ['Unlimited Accounts', 'Advanced API Access', 'Custom AI Training', 'Dedicated Manager', 'White-label Reports'],
            cta: 'Contact Sales',
            popular: false,
        },
    ]
};
