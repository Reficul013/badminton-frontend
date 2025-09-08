// src/pages/App.jsx
import React, { useState } from 'react'
import Nav from '../components/Nav.jsx'
import Browse from './Browse.jsx'
import HostRide from './HostRide.jsx'
import Profile from './Profile.jsx'

export default function App() {
  const [tab, setTab] = useState('browse')
  return (
    <div className="max-w-3xl mx-auto">
      <Nav tab={tab} setTab={setTab} />
      <main className="p-4">
        {tab === 'browse' && <Browse setTab={setTab} />}
        {tab === 'host' && <HostRide setTab={setTab} />}
        {tab === 'profile' && <Profile />}
      </main>
    </div>
  )
}
