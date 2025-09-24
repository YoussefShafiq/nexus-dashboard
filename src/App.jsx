import { useState } from 'react'
import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Home from './Components/Pages/Home'
import Login from './Components/Auth/Login'
import ProtectedRoute from './Components/Auth/ProtectedRoute'
import Layout from './Components/Layout/Layout'
import { Toaster } from 'react-hot-toast'
import SidebarContextProvider from './Contexts/SidebarContext'
import Integrations from './Components/Pages/Integrations'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Admins from './Components/Pages/Admins'
import Features from './Components/Pages/Features'
import Plans from './Components/Pages/Plans'
import { FcPrivacy } from 'react-icons/fc'
import PrivacyPolicy from './Components/Pages/PrivacyPolicy'
import TermsOfServices from './Components/Pages/TermsOfServices'
import Blogs from './Components/Pages/Blogs'
import NewsLetter from './Components/Pages/NewsLetter'
import DemoRequests from './Components/Pages/DemoRequests'
import Notfound from './Components/Notfound'
import UserSetting from './Components/Pages/UserSetting'
import HelpCenter from './Components/Pages/HelpCenter'
import HelpCenterCategories from './Components/Pages/HelpCenterCategories'
import HelpCenterSubcategories from './Components/Pages/HelpCenterSubcategories'
import HelpCenterArticles from './Components/Pages/HelpCenterArticles'
import Webinars from './Components/Pages/Webinars'
import WebinarsEvents from './Components/Pages/WebinarsEvents'
import WebinarsVideos from './Components/Pages/WebinarsVideos'

function App() {

  const router = createBrowserRouter([
    { path: '/login', element: <Login /> },
    {
      path: '/', element: <ProtectedRoute><Layout /></ProtectedRoute>, children: [
        { index: true, element: <ProtectedRoute><Home /></ProtectedRoute> },
        { path: '/integrations', element: <ProtectedRoute><Integrations /></ProtectedRoute> },
        { path: '/admins', element: <ProtectedRoute><Admins /></ProtectedRoute> },
        { path: '/plans', element: <ProtectedRoute><Plans /></ProtectedRoute> },
        { path: '/plans/features', element: <ProtectedRoute><Features /></ProtectedRoute> },
        { path: '/privacy-Policy', element: <ProtectedRoute><PrivacyPolicy /></ProtectedRoute> },
        { path: '/terms-of-services', element: <ProtectedRoute><TermsOfServices /></ProtectedRoute> },
        { path: '/blogs', element: <ProtectedRoute><Blogs /></ProtectedRoute> },
        { path: '/news-letter', element: <ProtectedRoute><NewsLetter /></ProtectedRoute> },
        { path: '/requested-demos', element: <ProtectedRoute><DemoRequests /></ProtectedRoute> },
        { path: '/user-setting', element: <ProtectedRoute><UserSetting /></ProtectedRoute> },
        { path: '/help-center', element: <ProtectedRoute><HelpCenter /></ProtectedRoute> },
        { path: '/help-center/categories', element: <ProtectedRoute> <HelpCenterCategories /></ProtectedRoute> },
        { path: '/help-center/subcategories', element: <ProtectedRoute><HelpCenterSubcategories /> </ProtectedRoute> },
        { path: '/help-center/articles', element: <ProtectedRoute><HelpCenterArticles /></ProtectedRoute> },
        { path: '/webinars', element: <ProtectedRoute><Webinars /></ProtectedRoute> },
        { path: '/webinars/events', element: <ProtectedRoute><WebinarsEvents /></ProtectedRoute> },
        { path: '/webinars/videos', element: <ProtectedRoute><WebinarsVideos /></ProtectedRoute> },
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
