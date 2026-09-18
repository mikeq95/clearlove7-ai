import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'

const ChatsPage = lazy(() => import('./pages/ChatsPage'))
const StarredPage = lazy(() => import('./pages/StarredPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/starred" element={<StarredPage />} />
        {/* Settings is open to all — users need it to enter their own API Key */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/sign-in" element={<LoginPage />} />
      </Routes>
    </Suspense>
  )
}
