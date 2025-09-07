import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

function NotFound() {
    return (
        <div className='flex flex-col items-center justify-center h-dvh bg-gradient-to-br from-background via-background to-primary/5'>
            <h1 className='text-5xl font-bold text-center'>404 - Not Found</h1>
            <p className='text-lg text-center mt-2'>The page you are looking for does not exist.</p>
            <Button asChild className='mt-4'>
                <Link href='/'>
                    Return Home
                </Link>
            </Button>
        </div>
    )
}

export default NotFound