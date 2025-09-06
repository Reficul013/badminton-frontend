// src/pages/App.jsx
import React, { useEffect, useState } from 'react'
import Nav from '../components/nav.jsx'
import Browse from './Browse'
import HostRide from './HostRide.jsx'
import Profile from './Profile'
import { ensureTempUser } from '../lib/api'

export default function App() {
  const [tab, setTab] = useState('browse')

  useEffect(() => {
    ensureTempUser()
  }, [])

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
