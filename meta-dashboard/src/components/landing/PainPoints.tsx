'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { landingPageData } from '@/data/landing-page';

const PainPoints = () => {
    const { youCanDoIt } = landingPageData;

    return (
        <section className="py-24 relative overflow-hidden" id="pain-points">
            {/* Background */}
            <div className="absolute inset-0 bg-[#0B0F1A]"></div>
            {/* Green/teal gradient for empowerment feel */}
            <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[100px]"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white"
                    >
                        {youCanDoIt.title}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 text-xl"
                    >
                        {youCanDoIt.subtitle}
                    </motion.p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {youCanDoIt.items.map((item, index) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.05] transition-all duration-300"
                        >
                            {/* Icon with green/teal gradient */}
                            <div className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 ring-1 ring-emerald-500/20 mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl text-emerald-400">{item.icon}</span>
                            </div>
                            <h3 className="font-bold text-white text-lg mb-3">{item.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{item.description}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Transition text to next section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="text-center mt-16"
                >
                    <p className="text-xl text-slate-300 font-medium">
                        Let&apos;s get started.
                    </p>
                    <div className="mt-4 flex justify-center">
                        <span className="material-symbols-outlined text-3xl text-emerald-400 animate-bounce">keyboard_double_arrow_down</span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default PainPoints;
