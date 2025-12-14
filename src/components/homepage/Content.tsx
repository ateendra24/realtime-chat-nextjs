"use client";
import { ArrowRight, Check, Shield, Zap, Globe, Code, BarChart3, MessageSquare, Users, Image as ImageIcon, Lock } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { motion } from 'motion/react'
import { AnimatedShinyText } from '../ui/animated-shiny-text';
import { cn } from '@/lib/utils';
import Image from 'next/image';

function Content() {
    return (
        <main className="flex-1 flex flex-col items-center w-full overflow-hidden pt-32 pb-20">
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 relative z-10">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center gap-8 mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div
                            className={cn(
                                "group rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                            )}
                        >
                            <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                                <span>✨ v2.0 is here</span>
                                <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                            </AnimatedShinyText>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="max-w-4xl"
                    >
                        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                            Connect instantly with <br />
                            <span className="text-primary">real-time messaging.</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                            Experience the future of communication. Create groups, share moments, and stay connected with friends and family in real-time.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md"
                    >
                        <Button size="lg" className="h-12 rounded-full px-8 w-full sm:w-auto" asChild>
                            <Link href="/sign-up">Start Chatting Now</Link>
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 rounded-full px-8 w-full sm:w-auto" asChild>
                            <Link href="https://github.com/ateendra24/realtime-chat-nextjs" target="_blank">View on GitHub</Link>
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
                                poster="/s4.png"
                            >
                                <source src="/demo-video.mp4" type="video/mp4" />
                                <Image fill src="/s1.png" alt="Chat app demo" className="object-cover" />
                            </video>
                        </div>
                    </motion.div>
                </div>

                {/* Bento Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-32 w-full max-w-5xl mx-auto" id="features">
                    {/* Large Card - Chat Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="col-span-1 md:col-span-2 row-span-2 rounded-3xl border border-border/50 bg-background/50 backdrop-blur overflow-hidden relative group min-h-[400px]"
                    >
                        <div className="p-8 relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-primary/10 text-primary"><MessageSquare className="w-6 h-6" /></div>
                                <h3 className="text-xl font-semibold">Real-time Conversations</h3>
                            </div>
                            <p className="text-muted-foreground mb-6 max-w-md">Experience fluid conversations with typing indicators, instant reactions and delivery. Powered by <span className="text-foreground font-medium">Ably</span>.</p>
                        </div>

                        {/* Mock Chat UI Illustration */}
                        <div className="absolute bottom-0 right-0 w-[90%] md:w-[80%] h-[65%] bg-background border-t border-l border-border/50 rounded-tl-3xl shadow-2xl p-6 flex flex-col gap-4 transition-transform duration-500 group-hover:translate-y-2 group-hover:translate-x-2">
                            {/* Mock Messages */}
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                                <div className="bg-muted rounded-2xl rounded-tl-none p-3 text-sm">Hey! Did you see the new update?</div>
                            </div>
                            <div className="flex items-start gap-3 flex-row-reverse">
                                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0" />
                                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none p-3 text-sm">Yeah! The real-time features are amazing. 🚀</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-12">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Alex is typing...
                            </div>
                        </div>

                        {/* Gradient Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -z-10" />
                    </motion.div>

                    {/* Small Card - Security */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="col-span-1 rounded-3xl border border-border/50 bg-background/50 backdrop-blur p-6 flex flex-col justify-between h-[240px] relative overflow-hidden group"
                    >
                        <div className="p-3 rounded-xl bg-green-500/10 w-fit text-green-500 mb-4 relative z-10"><Lock className="w-6 h-6" /></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold mb-2">End-to-End Encrypted*</h3>
                            <p className="text-sm text-muted-foreground">Your privacy is our priority. Messages are encrypted at rest and in transit.</p>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors" />
                    </motion.div>

                    {/* Small Card - Media */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="col-span-1 rounded-3xl border border-border/50 bg-background/50 backdrop-blur p-6 flex flex-col justify-between h-[240px] relative overflow-hidden group"
                    >
                        <div className="p-3 rounded-xl bg-blue-500/10 w-fit text-blue-500 mb-4 relative z-10"><ImageIcon className="w-6 h-6" /></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold mb-2">Rich Media Support</h3>
                            <p className="text-sm text-muted-foreground">Share high-res images with simplicity and security.</p>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
                    </motion.div>
                </div>

                {/* Tech Stack Section */}
                <div className="flex flex-col items-center gap-8 mb-32" id="tech-stack">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Built with modern technologies</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {['Next.js 15', 'React 19', 'Ably', 'Tailwind CSS', 'Shadcn UI'].map((tech) => (
                            <span key={tech} className="text-xl font-bold">{tech}</span>
                        ))}
                    </div>
                </div>

                {/* How it Works Section */}
                <div className="mb-32" id="how-it-works">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Start chatting in seconds</h2>
                        <p className="text-muted-foreground text-lg">No complex setup. Just sign in and connect.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <StepCard
                            number="01"
                            title="Sign Up Securely"
                            description="Create an account using your email or GitHub. Your data is encrypted and secure."
                            icon={<Lock className="w-8 h-8" />}
                        />
                        <StepCard
                            number="02"
                            title="Create a Room"
                            description="Start a direct message or create a new group for your team or friends."
                            icon={<MessageSquare className="w-8 h-8" />}
                        />
                        <StepCard
                            number="03"
                            title="Connect Instantly"
                            description="Send messages, share photos, and see who's typing in real-time."
                            icon={<Zap className="w-8 h-8" />}
                        />
                    </div>
                </div>

                {/* Unified Engine Section */}
                <div className="relative rounded-3xl bg-gradient-to-b from-muted/50 to-background border border-border/50 p-8 md:p-20 text-center overflow-hidden mb-32">
                    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">Powered by Ably Realtime</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
                        Built on top of a globally distributed edge network to ensure your messages never get lost.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" className="rounded-full" asChild>
                            <Link href="https://ably.com" target="_blank">Learn about Ably</Link>
                        </Button>
                        <Button className="rounded-full" asChild>
                            <Link href="/sign-up">Try it out</Link>
                        </Button>
                    </div>
                </div>

                {/* CTA Section */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-bold mb-8">Ready to connect?</h2>
                    <Button size="lg" className="h-14 px-10 rounded-full text-lg" asChild>
                        <Link href="/sign-up">Get Started for Free <ArrowRight className="ml-2 w-5 h-5" /></Link>
                    </Button>
                </div>

            </div>

            {/* Background Elements */}
        </main>
    )
}

function StepCard({ number, title, description, icon }: { number: string, title: string, description: string, icon: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-background/50 backdrop-blur border-border/50 overflow-hidden relative group h-full">
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl group-hover:opacity-20 transition-opacity">{number}</div>
                <CardHeader>
                    <div className="mb-4 text-primary">{icon}</div>
                    <CardTitle className="text-xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{description}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}

export default Content
