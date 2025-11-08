import Navbar from '@/components/homepage/Navbar'
import Content from '@/components/homepage/Content'
import Footer from '@/components/homepage/Footer'
import { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL("https://chat-flow-live.vercel.app"),
  keywords: ["ChatFlow", "ChatFlow Live", "Ateendra Pratap Solanki", "Chat Application", "Real-time Chat", "Messaging App", "Next.js Chat App", "Web Developer Portfolio"],
  title: 'ChatFlow Live - Real-time Chat Application',
  description: 'ChatFlow Live is a real-time chat application built with Next.js, offering seamless messaging experiences. Developed by Ateendra Pratap Solanki.',
  openGraph: {
    title: "ChatFlow Live - Real-time Chat Application",
    description: "ChatFlow Live is a real-time chat application built with Next.js, offering seamless messaging experiences.",
    url: "https://chat-flow-live.vercel.app",
    siteName: "ChatFlow Live",
    images: [
      {
        url: '/s0.png',
        alt: 'ChatFlow Live - Background Image',
        width: 1200,
        height: 630,
      }
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    site: "@ateendra24",
    title: "ChatFlow Live - Real-time Chat Application",
    description: "ChatFlow Live is a real-time chat application built with Next.js, offering seamless messaging experiences.",
    images: ['/s0.png'],
  },
  authors: [{ name: "Ateendra Pratap Solanki" }],
};

function page() {

  return (
    <div className="min-h-dvh flex flex-col">

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <Content />

      {/* Footer */}
      <Footer />

    </div>
  )
}

export default page
