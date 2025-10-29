import Navbar from '@/components/homepage/Navbar'
import Content from '@/components/homepage/Content'
import Footer from '@/components/homepage/Footer'

function page() {

  return (
    <div className="min-h-dvh bg-gradient-to-br from-primary/10 via-background to-primary/70 dark:to-primary/30 flex flex-col">

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
