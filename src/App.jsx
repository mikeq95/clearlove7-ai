import { Routes, Route } from 'react-router-dom'
import MainPage from './pages/MainPage'
import ChatsPage from './pages/ChatsPage'
import StarredPage from './pages/StarredPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/chats" element={<ChatsPage />} />
      <Route path="/starred" element={<StarredPage />} />
      {/* Settings is open to all — users need it to enter their own API Key */}
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/sign-in" element={<LoginPage />} />
    </Routes>
  )
}
