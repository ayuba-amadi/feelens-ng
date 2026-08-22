import { Menu, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

const navigation = [
  { label: 'Verify a Fee', href: '/#verify' },
  { label: 'MDAs', href: '/mdas' },
  { label: 'How It Works', href: '/methodology' },
]

function Wordmark() {
  return (
    <Link to="/" className="inline-flex items-center gap-2" aria-label="FeeLens NG home">
      <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white shadow-sm shadow-emerald-600/20">FL</span>
      <span className="text-lg font-bold tracking-tight text-slate-950">FeeLens <span className="text-emerald-600">NG</span></span>
    </Link>
  )
}

function Header() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false)
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Wordmark />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {navigation.map((item) => <Link key={item.label} to={item.href} className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">{item.label}</Link>)}
        </nav>
        <Link to="/about" className="hidden rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-600 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:inline-flex">About the Pilot</Link>
        <button type="button" className="inline-flex rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 lg:hidden" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} aria-controls="mobile-navigation" aria-label={isOpen ? 'Close menu' : 'Open menu'}>
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {isOpen && (
        <div id="mobile-navigation" className="fixed inset-x-0 top-[72px] max-h-[calc(100vh-72px)] overflow-y-auto border-t border-slate-100 bg-white px-5 py-4 shadow-xl shadow-slate-950/10 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => <Link key={item.label} to={item.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-emerald-600"><Search size={16} className="text-emerald-600" />{item.label}</Link>)}
            <Link to="/about" onClick={() => setIsOpen(false)} className="mt-2 rounded-lg bg-slate-950 px-3 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-emerald-600">About the Pilot</Link>
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
