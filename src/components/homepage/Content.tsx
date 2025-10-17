import { ArrowRight, Sparkles } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'

function Content() {
    return (
        <main className="flex-1 px-4 sm:px-6 py-10 sm:py-8 flex items-center justify-center min-h-[calc(100dvh-70px)] pb-24 md:pb-0">
            <div className="max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                    {/* Left Side - Text Content */}
                    <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium">
                                <Sparkles className="w-3 sm:w-4 h-3 sm:h-4" />
                                <span>Real-time Messaging Platform</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                                Connect & Chat
                                <br />
                                <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                                    Instantly
                                </span>
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                                Experience seamless real-time conversations with friends, share images instantly, and create dynamic group chats that bring people together.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-4">
                            <Button size="lg" className="text-sm sm:text-md px-6 sm:px-8 py-5 sm:py-6 rounded-full group shadow-lg shadow-primary/25 w-full sm:w-auto" asChild>
                                <Link href="/sign-in">
                                    Start Chatting
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="text-sm sm:text-md px-6 sm:px-8 py-5 sm:py-6 rounded-full w-full sm:w-auto" asChild>
                                <Link href="/sign-up">
                                    Create Account
                                </Link>
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 sm:gap-8 pt-8">
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">Real-time</div>
                                <div className="text-sm text-muted-foreground">Messaging</div>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-border" />
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">Secure</div>
                                <div className="text-sm text-muted-foreground">& Private</div>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-border" />
                            <div className="text-center lg:text-left">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">Fast</div>
                                <div className="text-sm text-muted-foreground">Delivery</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Video Showcase */}
                    <div className="relative">
                        {/* Decorative Elements */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-3xl blur-3xl" />
                        <div className="absolute -inset-2 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />

                        {/* Video Container */}
                        <div className="relative group">
                            <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-gradient-to-br from-muted/50 to-muted">
                                {/* Replace with your actual video */}
                                <video
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/s3.png"
                                >
                                    <source src="/demo-video.mp4" type="video/mp4" />
                                    {/* Fallback image if video doesn't load */}
                                    <img src="/s1.png" alt="Chat app demo" className="w-full h-full object-cover" />
                                </video>

                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </main>
    )
}

export default Content
