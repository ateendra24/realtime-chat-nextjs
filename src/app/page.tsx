import Navbar from '@/components/homepage/Navbar'
import Content from '@/components/homepage/Content'
import Footer from '@/components/homepage/Footer'

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
