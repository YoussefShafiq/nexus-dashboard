import { useQuery } from '@tanstack/react-query'
import axios from 'axios';
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import AdminsDataTable from '../DataTables/AdminsDataTable';
import toast from 'react-hot-toast';

export default function Admins() {
    const navigate = useNavigate();

    function getAdminsData() {
        return axios.get(
            `https://nexus-consults.com/api/admin/users`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: admins, isLoading, refetch, error, isError } = useQuery({
        queryKey: ['admins'],
        queryFn: getAdminsData,
        onError: () => {
            console.log(error);
            // if (error.response?.status == 401) {
            //     localStorage.removeItem('userToken')
            //     navigate('/login')
            // }
        }
    })

    function getpermissionsData() {
        return axios.get(
            `https://nexus-consults.com/api/admin/permissions`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }
        );
    }

    const { data: permissions, error: perError } = useQuery({
        queryKey: ['permissions'],
        queryFn: getpermissionsData
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

    useEffect(() => {
        console.log(permissions);

    }, [permissions, perError])





    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Admins</h1>
            <AdminsDataTable
                admins={admins?.data?.data || []}
                allPermissions={permissions?.data?.data?.all_permissions || []}
                loading={isLoading}
                refetch={refetch}
            />
        </div>
    )
}