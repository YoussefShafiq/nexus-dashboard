import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import JobsDataTable from '../DataTables/JobsDataTable';

export default function Jobs() {
    const navigate = useNavigate();

    function getAllJobs() {
        return axios.get(
            `https://nexus-consults.com/api/admin/jobs`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: jobs, isLoading, refetch, isError, error } = useQuery({
        queryKey: ['jobs'],
        queryFn: getAllJobs,
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Jobs</h1>
            <JobsDataTable
                jobs={jobs?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}
