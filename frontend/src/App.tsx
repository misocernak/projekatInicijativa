import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import About from './pages/About'
import Results from './pages/Results'
import Admin from './pages/Admin'
import EditInitiative from './pages/EditInitiative'
import { Privacy, Terms } from './pages/Legal'
import { ConfirmEmail, ForgotPassword, ResetPassword } from './pages/AccountLinks'
import Auth from './pages/Auth'
import Home from './pages/Home'
import InitiativeDetail from './pages/InitiativeDetail'
import Initiatives from './pages/Initiatives'
import NewInitiative from './pages/NewInitiative'
import Profile from './pages/Profile'

function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-4xl text-sage-deep">Stranica ne postoji</h1>
      <Link to="/" className="btn-primary mt-6">
        Na početnu
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="inicijative" element={<Initiatives />} />
            <Route path="inicijative/:id" element={<InitiativeDetail />} />
            <Route path="inicijative/:id/izmena" element={<EditInitiative />} />
            <Route path="uradili-smo" element={<Results />} />
            <Route path="nova-inicijativa" element={<NewInitiative />} />
            <Route path="admin" element={<Admin />} />
            <Route path="privatnost" element={<Privacy />} />
            <Route path="uslovi" element={<Terms />} />
            <Route path="prijava" element={<Auth />} />
            <Route path="profil" element={<Profile />} />
            <Route path="o-projektu" element={<About />} />
            <Route path="potvrda-mejla" element={<ConfirmEmail />} />
            <Route path="zaboravljena-lozinka" element={<ForgotPassword />} />
            <Route path="nova-lozinka" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
