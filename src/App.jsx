import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut } from '@clerk/clerk-react'
import MainPage from './pages/MainPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/settings" element={
        <>
          <SignedIn>
            <SettingsPage />
          </SignedIn>
          <SignedOut>
            <LoginPage />
          </SignedOut>
        </>
      } />
      <Route path="/sign-in" element={<LoginPage />} />
    </Routes>
  )
}
