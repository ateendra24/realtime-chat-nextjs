import { ArrowRight } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { AnimatedShinyText } from '../ui/animated-shiny-text'
import Image from 'next/image'

function Content() {
    return (
        <main className="flex-1 px-4 sm:px-6 py-10 sm:py-8 flex items-center justify-center min-h-[calc(100dvh-70px)] pb-24 md:pb-0">
            <div className="max-w-7xl mx-auto w-full">
                {/* Hero Section */}
                <div className="grid gap-8 sm:gap-12 items-center">
                    {/* Left Side - Text Content */}
                    <div className="space-y-3 sm:space-y-4 text-center">
                        <div className="group mx-auto w-fit rounded-full border border-black/5 bg-neutral-100 text-base text-white transition-all ease-in hover:cursor-pointer hover:bg-neutral-200 dark:border-white/5 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                            <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1 transition ease-out hover:text-neutral-600 hover:duration-300 hover:dark:text-neutral-400">
                                <span>✨ v2.0 is here!</span>
                                <ArrowRight className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                            </AnimatedShinyText>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold ">
                                Connect & Chat <br />
                                <span className="bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                                    Instantly
                                </span>
                            </h1>
                            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                                Experience seamless real-time conversations with friends, share images instantly, and create dynamic group chats that bring people together.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 pt-4">
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
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 pt-8">
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">Real-time</div>
                                <div className="text-sm text-muted-foreground">Messaging</div>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-border" />
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">Secure</div>
                                <div className="text-sm text-muted-foreground">& Private</div>
                            </div>
                            <div className="hidden sm:block h-12 w-px bg-border" />
                            <div className="text-center">
                                <div className="text-2xl sm:text-3xl font-bold text-primary">Fast</div>
                                <div className="text-sm text-muted-foreground">Delivery</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Video Showcase */}
                    <div className="relative py-3 order-first md:order-last max-w-5xl mx-auto">
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
                                    <Image width={1000} height={700} src="/s1.png" alt="Chat app demo" className="w-full h-full object-cover" />
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
