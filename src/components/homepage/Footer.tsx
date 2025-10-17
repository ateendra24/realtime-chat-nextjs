import React from 'react'
import Link from 'next/link'
import { siteConfig } from '@/config/siteConfig'
import { Github, Heart } from 'lucide-react'
import X from '../icons/X'

function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="relative w-full border-t border-border/40 bg-background/95 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Main Footer Content */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    {/* Left: Copyright */}
                    <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                        © {currentYear} {siteConfig.name}. All rights reserved.
                    </p>

                    {/* Center: Built with */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                        <span>Built with</span>
                        <Heart className="w-3.5 h-3.5 text-primary fill-primary animate-pulse" />
                        <span>using Next.js</span>
                    </div>

                    {/* Right: Social Links */}
                    <div className="flex items-center gap-2">
                        <Link
                            href={siteConfig.links.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-all hover:scale-110 flex items-center justify-center"
                            aria-label="GitHub"
                        >
                            <Github className="w-4 h-4" />
                        </Link>
                        <Link
                            href={siteConfig.links.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-all hover:scale-110 flex items-center justify-center"
                            aria-label="Twitter"
                        >
                            <X width={16} height={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
