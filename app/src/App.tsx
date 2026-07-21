import { Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Home from './screens/Home'
import Daily from './screens/Daily'
import Rooms from './screens/Rooms'
import Profile from './screens/Profile'
import ChainGame from './screens/ChainGame'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/play/chain" element={<ChainGame />} />
    </Routes>
  )
}
