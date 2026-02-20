import { Outlet, Link, useLocation } from 'react-router-dom'
import { Brain, Users, Search, BarChart3, Settings, Settings2, LogOut, Activity } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import clsx from 'clsx'

const navItems = [
  { path: '/', label: 'Overview', icon: Brain },
  { path: '/users', label: 'Indexes', icon: Users },
  { path: '/query', label: 'Query', icon: Search },
  { path: '/metrics', label: 'Metrics', icon: BarChart3 },
  { path: '/config', label: 'Config', icon: Settings2 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-neuron-500" />
            <div>
              <h1 className="text-lg font-bold text-white">QubicDB</h1>
              <p className="text-xs text-slate-400">Console</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-neuron-600 text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neuron-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {user?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-slate-300">{user}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {navItems.find((item) => item.path === location.pathname)?.label || 'QubicDB'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Activity className="w-4 h-4 text-neuron-500" />
              <span>Connected</span>
            </div>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
