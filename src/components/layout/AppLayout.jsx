import Footer from './Footer'
import Header from './Header'

function AppLayout({ children }) {
  return <div className="min-h-screen bg-white text-slate-950"><Header /><main>{children}</main><Footer /></div>
}

export default AppLayout
