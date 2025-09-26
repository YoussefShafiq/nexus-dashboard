import { useState } from 'react'
import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Login from './Components/Auth/Login'
import ProtectedRoute from './Components/Auth/ProtectedRoute'
import Layout from './Components/Layout/Layout'
import { Toaster } from 'react-hot-toast'
import SidebarContextProvider from './Contexts/SidebarContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Notfound from './Components/Notfound'
import Services from './Components/Pages/Services'
import Home from './Components/Pages/Home'
import Projects from './Components/Pages/Projects'
import Admins from './Components/Pages/Admins'

function App() {

  const router = createBrowserRouter([
    { path: '/login', element: <Login /> },
    {
      path: '/', element: <ProtectedRoute><Layout /></ProtectedRoute>, children: [
        { index: true, element: <ProtectedRoute><Home /></ProtectedRoute> },
        { path: '/services', element: <ProtectedRoute><Services /></ProtectedRoute> },
        { path: '/projects', element: <ProtectedRoute><Projects /></ProtectedRoute> },
        { path: '/admins', element: <ProtectedRoute><Admins /></ProtectedRoute> },

      ]
    },
    { path: '*', element: <Notfound /> }
  ])

  let query = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  return (
    <>
      <SidebarContextProvider>
        <QueryClientProvider client={query}>
          <RouterProvider router={router} />
          <Toaster
            position='bottom-right'
            reverseOrder={false}
          />
        </QueryClientProvider>
      </SidebarContextProvider>
    </>
  )
}

export default App
