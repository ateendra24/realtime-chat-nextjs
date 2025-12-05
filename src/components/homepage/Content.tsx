"use client";
import { ArrowRight, Shield, Zap, Image as ImageIcon } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { AnimatedShinyText } from '../ui/animated-shiny-text'
import Image from 'next/image'
import { motion } from 'motion/react'

function Content() {
    return (
        <main className="flex-1 flex flex-col items-center w-full overflow-hidden pt-24 pb-10">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 relative">

                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-3xl -z-10 opacity-50" />

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center gap-8 mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                    >
                        <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                            <span>✨ v2.0 is here</span>
                            <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                        </AnimatedShinyText>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="space-y-4 max-w-4xl"
                    >
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight">
                            Chat that keeps you <br />
                            <span className="relative">
                                <span className="relative z-10 bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">connected.</span>
                                <span className="absolute bottom-2 left-0 w-full h-3 bg-primary/20 -rotate-1 z-0 rounded-full" />
                            </span>
                        </h1>
                        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Turn your conversations into lasting memories. Share moments, plan events, and stay in sync with the people who matter most.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center gap-4"
                    >
                        <Button size="lg" className="text-base px-8 py-6 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-1" asChild>
                            <Link href="/sign-in">
                                Start Chatting Now
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-base px-8 py-6 rounded-full hover:bg-secondary/80" asChild>
                            <Link href="/sign-up">
                                Create Free Account
                            </Link>
                        </Button>
                    </motion.div>
                </div>

                {/* App Showcase / Visuals */}
                <div className="relative w-full max-w-5xl mx-auto mb-32">

                    {/* Main Video/Image Container */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl bg-black/5 backdrop-blur-sm"
                    >
                        <div className="aspect-video w-full bg-muted/50 relative">
                            <video
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                                poster="/s3.png"
                            >
                                <source src="/demo-video.mp4" type="video/mp4" />
                                <Image fill src="/s1.png" alt="Chat app demo" className="object-cover" />
                            </video>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
                        </div>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-yellow-500" />}
                        title="Lightning Fast"
                        description="Messages delivered in milliseconds. Real-time is our standard, not a feature."
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={<Shield className="w-6 h-6 text-green-500" />}
                        title="Secure & Private"
                        description="Your conversations are yours alone. End-to-end encryption* keeps them that way."
                        delay={0.3}
                    />
                    <FeatureCard
                        icon={<ImageIcon className="w-6 h-6 text-blue-500" />}
                        title="Media Rich"
                        description="Share high-quality photos and files instantly without losing quality."
                        delay={0.4}
                    />
                </div>

                {/* Secondary CTA Section */}
                <div className="rounded-3xl bg-muted/30 border border-border/50 p-8 sm:p-12 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 to-transparent -z-10" />
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start chatting?</h2>
                    <p className="text-muted-foreground mb-8 max-w-xl mx-auto">Join users who are already connecting with friends and family on ChatFlow.</p>
                    <Button size="lg" className="rounded-full px-8" asChild>
                        <Link href="/sign-up">Get Started for Free</Link>
                    </Button>
                </div>

            </div>
        </main>
    )
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </motion.div>
    )
}

export default Content
