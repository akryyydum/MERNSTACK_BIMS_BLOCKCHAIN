import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-100 flex flex-col items-center justify-center p-6">
        <div className="bg-white/80 shadow-2xl rounded-3xl px-10 py-12 max-w-xl w-full flex flex-col items-center border border-blue-200">
          <img src="/vite.svg" alt="Barangay Logo" className="w-20 h-20 mb-4 drop-shadow-lg" />
          <h1 className="text-4xl font-extrabold text-blue-700 mb-2 tracking-tight text-center">Barangay Information Management System</h1>
          <p className="text-lg text-gray-600 mb-6 text-center">Empowering communities with digital solutions for efficient barangay governance, resident records, and transparent services.</p>
          <div className="flex flex-col gap-4 w-full">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow transition-all">Resident Portal</button>
            <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl shadow transition-all">Barangay Staff Login</button>
          </div>
          <div className="mt-8 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Barangay System. All rights reserved.
          </div>
        </div>
      </div>
  )
}

export default App
