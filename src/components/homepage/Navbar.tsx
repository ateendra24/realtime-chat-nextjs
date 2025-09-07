"use client"
import { siteConfig } from '@/config/siteConfig'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Moon, Sun } from 'lucide-react'
import Link from 'next/link'
import Github from '../icons/Github'
import X from '../icons/X'

function Navbar() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch by only rendering theme toggle after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <header className="relative z-10 w-full p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <div className="relative">
                        {/* <MessageSquare className="h-8 w-8 text-primary" /> */}
                        <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-8 w-8 text-primary" />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                        {siteConfig.name}
                    </span>
                </div>
                <div className="hidden md:flex items-center space-x-2">
                    {mounted ? (
                        theme === "light" ? (
                            <Button size="sm" onClick={() => setTheme("dark")} className='cursor-pointer rounded-full'>
                                <Sun className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => setTheme("light")} className='cursor-pointer rounded-full'>
                                <Moon className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                        )
                    ) : (
                        // Render a placeholder button to prevent layout shift
                        <Button size="sm" className='cursor-pointer rounded-full' disabled>
                            <div className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="secondary" size="sm" className='rounded-full cursor-pointer' asChild>
                        <Link href={siteConfig.links.github} target='_blank' rel='noopener noreferrer'>
                            <Github />
                        </Link>
                    </Button>
                    <Button variant="secondary" size="sm" className='rounded-full cursor-pointer' asChild>
                        <Link href={siteConfig.links.twitter} target='_blank' rel='noopener noreferrer'>
                            <X />
                        </Link>
                    </Button>
                </div>
            </div>
        </header>
    )
}

export default Navbar
