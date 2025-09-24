import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import NewsLetterDataTable from '../DataTables/NewsLetterDataTable';
import { RiArrowGoBackFill } from 'react-icons/ri';
import toast from 'react-hot-toast';

export default function NewsLetter() {
    const navigate = useNavigate();

    function getAllNewsLetter() {
        return axios.get(
            `https://api.nexus.com/api/admin/newsletter`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: newsletter, isLoading, refetch, isError, error } = useQuery({
        queryKey: ['newsletter'],
        queryFn: getAllNewsLetter,
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
            <button className='bg-gray-200 text-primary p-3 rounded-full aspect-square mb-2' onClick={() => navigate(`/blogs`)}><RiArrowGoBackFill /></button>
            <h1 className="text-3xl font-bold text-gray-800 mb-8">News Letter</h1>
            <NewsLetterDataTable
                NewsLetter={newsletter?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}