import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import BlogsDataTable from '../DataTables/BlogsDataTable';
import toast from 'react-hot-toast';

export default function Blogs() {
    const navigate = useNavigate();

    const { data: currentUser, isLoading: isCurrentuserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/auth/me',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    })

    function getAllBlogs() {
        return axios.get(
            `https://api.nexus.com/api/admin/blogs`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: blogs, isLoading, refetch, isError, error } = useQuery({
        queryKey: ['blogs'],
        queryFn: getAllBlogs,
    })

    useEffect(() => {
        if (isError) {
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        }
    }, [isError])

    return (
        <div className="p-4">
            {currentUser?.data?.data?.permissions?.includes('view_newsletter_subscribers') && <>
                <h1 className="text-3xl font-bold text-gray-800 mb-8">News letter</h1>
                <Link to={'/news-letter'} className='bg-primary text-white py-2 px-3 rounded-xl' >Open news letter</Link>
                <hr className='my-5' />
            </>}
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Blogs</h1>
            <BlogsDataTable
                blogs={blogs?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}