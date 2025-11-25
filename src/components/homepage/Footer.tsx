import React from 'react'
import { siteConfig } from '@/config/siteConfig'
import { Heart } from 'lucide-react'

function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="relative w-full">
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
                </div>
            </div>
        </footer>
    )
}

export default Footer
