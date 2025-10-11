import React, { useContext } from 'react'
import Sidebar from './Sidebar'
import { Outlet, useNavigate } from 'react-router-dom'
import { SidebarContext } from '../../Contexts/SidebarContext'
import { User2Icon, UserCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export function UserBar() {
    const navigate = useNavigate()
    const { data: currentUser, isLoading: isCurrentUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/public/api/admin/auth/profile', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            });
        }
    });
    return <>
        <div onClick={() => navigate('/user-setting')} className="fixed top-5 right-5 h-11 w-11 flex justify-center items-center rounded-full bg-white cursor-pointer shadow-lg">
            {currentUser?.data?.data?.user?.profile_image ? <img
                src={(currentUser?.data?.data?.user?.profile_image)}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border-gray-200"
            /> : <UserCircle2 className='hover:scale-[1.04] transition-all' />}
        </div>
    </>
}
export default function Layout() {
    const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext)
    return <>
        <UserBar />
        <div className="flex min-h-screen">
            <div className={`${sidebarOpen ? 'md:w-56' : 'w-0'} transition-all duration-500`}>
                <Sidebar />
            </div>
            <div className={`${sidebarOpen ? 'w-full md:w-[calc(100%-224px)] ps-0' : 'w-full'} md:p-5  text-black transition-all duration-500 bg-background`}>
                <Outlet />
            </div>
        </div>
    </>
}
