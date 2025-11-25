"use client"
import { siteConfig } from '@/config/siteConfig'
import { useTheme } from 'next-themes'
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
                    <span className="text-2xl font-bold text-secondary-foreground">
                        {siteConfig.name}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    {mounted ? (
                        theme === "light" ? (
                            <Button size="icon" onClick={() => setTheme("dark")} className='cursor-pointer rounded-full'>
                                <Sun className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                        ) : (
                            <Button size="icon" onClick={() => setTheme("light")} className='cursor-pointer rounded-full'>
                                <Moon className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                        )
                    ) : (
                        // Render a placeholder button to prevent layout shift
                        <Button size="icon" className='cursor-pointer rounded-full' disabled>
                            <div className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="secondary" size="icon" className='rounded-full cursor-pointer' asChild>
                        <Link href={siteConfig.links.github} target='_blank' rel='noopener noreferrer'>
                            <Github />
                        </Link>
                    </Button>
                    <Button variant="secondary" size="icon" className='rounded-full cursor-pointer' asChild>
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
