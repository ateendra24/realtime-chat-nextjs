import Navbar from '@/components/homepage/Navbar'
import Content from '@/components/homepage/Content'

function page() {

  return (
    <div className="min-h-dvh bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <Content />

    </div>
  )
}

export default page
