"use client"
import { siteConfig } from '@/config/siteConfig'
import { useTheme } from 'next-themes'
import React, { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Moon, Sun, MessageCircle, Star } from 'lucide-react'
import Link from 'next/link'
import Github from '../icons/Github'

interface NavbarProps {
    githubStars?: number | null
}

function Navbar({ githubStars }: NavbarProps) {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
                <Link href="/" className="flex items-center space-x-2">
                    <MessageCircle className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold">{siteConfig.name}</span>
                </Link>

                <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                    <Link href="#features" className="transition-colors hover:text-primary text-muted-foreground">Features</Link>
                    <Link href="#tech-stack" className="transition-colors hover:text-primary text-muted-foreground">Tech Stack</Link>
                    <Link href={siteConfig.links.github} target="_blank" className="transition-colors hover:text-primary text-muted-foreground">Source</Link>
                </nav>

                <div className="flex items-center space-x-2">
                    {mounted && (
                        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="rounded-full">
                            {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                    )}

                    <Button variant="secondary" className='hidden sm:flex rounded-full cursor-pointer gap-0 px-3' asChild>
                        <Link href={siteConfig.links.github} target='_blank' rel='noopener noreferrer'>
                            <Github className="h-4 w-4 mr-1.5" />
                            <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 mr-0.5" />
                            <span className="text-sm font-medium">{githubStars ?? 'Star'}</span>
                        </Link>
                    </Button>

                    <Link href="/sign-up">
                        <Button size="sm" className="rounded-full px-6">Get Started</Button>
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default Navbar
