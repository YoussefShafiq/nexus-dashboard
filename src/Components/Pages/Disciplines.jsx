import { useQuery } from '@tanstack/react-query'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import DisciplinesDataTable from '../DataTables/DisciplinesDataTable';
import axios from 'axios';

export default function Disciplines() {


    const navigate = useNavigate();

    const { data: disciplinesData, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['disciplines'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/public/api/admin/disciplines',
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Disciplines</h1>
            <DisciplinesDataTable
                disciplinessData={disciplinesData?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )

}
