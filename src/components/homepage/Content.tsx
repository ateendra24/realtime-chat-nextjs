import { ArrowRight, MessageSquare } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'

function Content() {
    return (
        <main className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="max-w-4xl mx-auto text-center space-y-12">
                {/* Hero Section */}
                <div className="space-y-6">
                    <div className="relative inline-block">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-3xl scale-110" />
                        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-full border border-primary/20">
                            <MessageSquare className="h-16 w-16 text-primary" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent leading-tight">
                            Connect & Chat
                            <br />
                            <span className="text-primary">Instantly</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Experience seamless real-time conversations with friends and create dynamic group chats that bring people together.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button size="lg" className="text-md px-8 py-6 rounded-full group" asChild>
                            <Link href="/sign-in">
                                Start Chatting
                                <ArrowRight className="ml-1 w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" className="text-md px-8 py-6 rounded-full" asChild>
                            <Link href="/sign-up">
                                Create Account
                            </Link>
                        </Button>
                    </div>
                </div>

            </div>
        </main>
    )
}

export default Content
