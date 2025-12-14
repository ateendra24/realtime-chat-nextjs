import React from 'react'
import { siteConfig } from '@/config/siteConfig'
import { MessageCircle } from 'lucide-react'
import Link from 'next/link'

function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t bg-background/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="h-6 w-6 text-primary" />
                            <span className="font-bold text-lg">{siteConfig.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Real-time chat application built with modern web technologies. Open source and free to use.
                        </p>
                    </div>

                    <div className='hidden md:block' />

                    <div className="flex flex-col gap-3 md:items-end">
                        <h3 className="font-semibold text-sm">Product</h3>
                        <Link href="#features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</Link>
                        <Link href="#tech-stack" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tech Stack</Link>
                        <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-primary transition-colors">How It Works</Link>
                        <Link href={siteConfig.links.github} target="_blank" className="text-sm text-muted-foreground hover:text-primary transition-colors">Source Code</Link>
                    </div>

                    <div className="flex flex-col gap-3 md:items-end">
                        <h3 className="font-semibold text-sm">Resources</h3>
                        <Link href="https://nextjs.org" target="_blank" className="text-sm text-muted-foreground hover:text-primary transition-colors">Next.js</Link>
                        <Link href="https://ably.com" target="_blank" className="text-sm text-muted-foreground hover:text-primary transition-colors">Ably</Link>
                        <Link href="https://ui.shadcn.com" target="_blank" className="text-sm text-muted-foreground hover:text-primary transition-colors">Shadcn UI</Link>
                        <Link href="https://tailwindcss.com" target="_blank" className="text-sm text-muted-foreground hover:text-primary transition-colors">Tailwind CSS</Link>
                    </div>

                    {/* <div className="flex flex-col gap-3">
                        <h3 className="font-semibold text-sm">Legal</h3>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Cookie Policy</Link>
                    </div> */}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                        © {currentYear} {siteConfig.name}. Built by <a href={siteConfig.author.url} target="_blank" className="hover:underline hover:text-primary">{siteConfig.author.name}</a>.
                    </p>
                    <div className="flex gap-6">
                        <a href={siteConfig.links.twitter} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            Twitter
                        </a>
                        <a href={siteConfig.links.github} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                            GitHub
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
