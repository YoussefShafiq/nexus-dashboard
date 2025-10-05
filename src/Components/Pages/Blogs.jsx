import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BlogsDataTable from '../DataTables/BlogsDataTable';

export default function Blogs() {
    const navigate = useNavigate();


    function getAllBlogs() {
        return axios.get(
            `https://nexus-consults.com/api/public/api/admin/blogs`,
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

            <h1 className="text-3xl font-bold text-gray-800 mb-8">Blogs</h1>
            <BlogsDataTable
                blogs={blogs?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}