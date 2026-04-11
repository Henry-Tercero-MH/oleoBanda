import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MusicosProvider } from './contexts/MusicosContext'
import { FinanzasProvider } from './contexts/FinanzasContext'
import { RecursosProvider } from './contexts/RecursosContext'
import { ListasProvider } from './contexts/ListasContext'
import { GastosProvider } from './contexts/GastosContext'
import { NotificacionesProvider } from './contexts/NotificacionesContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Musicos from './pages/Musicos'
import Recursos from './pages/Recursos'
import Finanzas from './pages/Finanzas'
import Ajustes from './pages/Ajustes'
import Listas from './pages/Listas'
import Gastos from './pages/Gastos'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MusicosProvider>
          <FinanzasProvider>
            <RecursosProvider>
              <ListasProvider>
              <GastosProvider>
              <NotificacionesProvider>
              <Routes>
                {/* Pública */}
                <Route path="/login" element={<Login />} />

                {/* Protegidas */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/musicos"  element={<Musicos />} />
                  <Route path="/recursos" element={<Recursos />} />
                  <Route path="/listas"   element={<Listas />} />
                  <Route path="/gastos"   element={<Gastos />} />
                  <Route path="/finanzas" element={<Finanzas />} />
                  <Route path="/ajustes"  element={<Ajustes />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </NotificacionesProvider>
              </GastosProvider>
              </ListasProvider>
            </RecursosProvider>
          </FinanzasProvider>
        </MusicosProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
