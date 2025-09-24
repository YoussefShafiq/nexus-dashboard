import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import HelpcenterCategoriesDataTable from '../DataTables/HelpcenterCategoriesDataTable';
import toast from 'react-hot-toast';

export default function HelpCenterCategories() {
    const navigate = useNavigate();

    const { data: helpcenterCategoriesData, isLoading: ishelpcenterCategoriesLoading, isError, error, isLoading, refetch } = useQuery({
        queryKey: ['helpcenterCategories'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/admin/help-center/categories',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Help Center Categories</h1>
            <HelpcenterCategoriesDataTable
                helpcenterCategoriesData={helpcenterCategoriesData?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}