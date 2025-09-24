import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import FeaturesDataTable from '../DataTables/FeaturesDataTable';
import { RiArrowGoBackFill } from 'react-icons/ri';
import toast from 'react-hot-toast';

export default function Features() {
    const navigate = useNavigate();

    function getAllFeatures() {
        return axios.get(
            `https://api.nexus.com/api/admin/features`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: features, isLoading, refetch, isError, error } = useQuery({
        queryKey: ['features'],
        queryFn: getAllFeatures,
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
            <button className='bg-gray-200 text-primary p-3 rounded-full aspect-square mb-2' onClick={() => navigate(`/plans`)}><RiArrowGoBackFill /></button>
            <h1 className="text-3xl font-bold text-gray-800 mb-8 mt-3">Plans features</h1>
            <FeaturesDataTable
                features={features?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}