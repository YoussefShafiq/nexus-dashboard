import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import WebinarsVideosDataTable from '../DataTables/WebinarsVideosDataTable';
import toast from 'react-hot-toast';

export default function WebinarsVideos() {
    const navigate = useNavigate();

    const { data: WebinarsVideosData, isLoading: isWebinarsVideosLoading, isError, error, isLoading, refetch } = useQuery({
        queryKey: ['WebinarsVideos'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/admin/webinars/videos',
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Webinars Events</h1>
            <WebinarsVideosDataTable
                WebinarsVideosData={WebinarsVideosData?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}
// NN4W1Kv6dPo ? si = t10HqHn64mbPGdLA
// NN4W1Kv6dPo ? si = DLm6W1qF3m - L8cRG