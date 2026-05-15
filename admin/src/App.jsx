import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui/Spinner'
import LoginPage from './components/auth/LoginPage'
import Layout from './components/layout/Layout'
import OrdersPage from './components/orders/OrdersPage'
import MenuPage from './components/menu/MenuPage'
import AnalyticsPage from './components/analytics/AnalyticsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-[#a0a0a0] text-sm">Loading admin console…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route index element={<Navigate to="/orders" replace />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="*" element={<Navigate to="/orders" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
