import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import FeaturesDataTable from '../DataTables/FeaturesDataTable';
import HelpcenterDataTable from '../DataTables/HelpcenterCategoriesDataTable';
import toast from 'react-hot-toast';
import HelpcenterSubcategoriesDataTable from '../DataTables/HelpcenterSubcategoriesDataTable';

export default function HelpCenterSubcategories() {
    const navigate = useNavigate();

    const { data: helpcenterSubcategoriesData, isLoading: ishelpcenterSubcategoriesLoading, isError, error, isLoading, refetch } = useQuery({
        queryKey: ['helpcenterSubcategories'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/admin/help-center/subcategories',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    })

    const { data: helpcenterCategoriesData, isLoading: ishelpcenterCategoriesLoading } = useQuery({
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Help Center Subcategories</h1>
            <HelpcenterSubcategoriesDataTable
                helpcenterSubcategoriesData={helpcenterSubcategoriesData?.data?.data || []}
                helpcenterCategoriesData={helpcenterCategoriesData?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}