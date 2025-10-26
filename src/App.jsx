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
import Blogs from './Components/Pages/Blogs'
import Jobs from './Components/Pages/Jobs'
import JobsApplications from './Components/Pages/JobsApplications'
import Testmonials from './Components/Pages/Testmonials'
import AboutUs from './Components/Pages/AboutUs'
import UserSetting from './Components/Pages/UserSetting'
import Disciplines from './Components/Pages/Disciplines'
import ErrorPage from './Components/errorHandling/ErrorPage'

function App() {

  const router = createBrowserRouter([
    { path: '/login', element: <Login /> },
    {
      path: '/', element: <ProtectedRoute><Layout /></ProtectedRoute>, errorElement: <ErrorPage />, children: [
        { index: true, element: <ProtectedRoute><Home /></ProtectedRoute> },
        { path: '/services', element: <ProtectedRoute><Services /></ProtectedRoute> },
        { path: '/projects', element: <ProtectedRoute><Projects /></ProtectedRoute> },
        { path: '/admins', element: <ProtectedRoute><Admins /></ProtectedRoute> },
        { path: '/blogs', element: <ProtectedRoute><Blogs /></ProtectedRoute> },
        { path: '/jobs', element: <ProtectedRoute><Jobs /></ProtectedRoute> },
        { path: '/jobs-applications', element: <ProtectedRoute><JobsApplications /></ProtectedRoute> },
        { path: '/testmonials', element: <ProtectedRoute><Testmonials /></ProtectedRoute> },
        { path: '/about-us', element: <ProtectedRoute><AboutUs /></ProtectedRoute> },
        { path: '/user-setting', element: <ProtectedRoute><UserSetting /></ProtectedRoute> },
        { path: '/disciplines', element: <ProtectedRoute><Disciplines /></ProtectedRoute> },

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
