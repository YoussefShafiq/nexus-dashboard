import { useQuery } from '@tanstack/react-query'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import TestmonialsDataTable from '../DataTables/TestmonialsDataTable';
import axios from 'axios';

export default function Testmonials() {


    const navigate = useNavigate();

    const { data: testmonialsData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['testmonials'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/public/api/admin/feedbacks',
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Testmonials</h1>
            <TestmonialsDataTable
                testmonialsData={testmonialsData?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )

}
