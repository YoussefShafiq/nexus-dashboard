import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProjectsDataTable from '../DataTables/ProjectsDataTable';

export default function Projects() {
    const navigate = useNavigate();


    function getAllProjects() {
        return axios.get(
            `https://nexus-consults.com/api/public/api/admin/projects`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: projects, isLoading, refetch, isError, error } = useQuery({
        queryKey: ['projects'],
        queryFn: getAllProjects,
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
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Projects</h1>
            <ProjectsDataTable
                projects={projects?.data?.data || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}