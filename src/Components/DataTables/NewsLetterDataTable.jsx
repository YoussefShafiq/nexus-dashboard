import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FaSpinner,
    FaTrashAlt,
    FaChevronRight,
    FaChevronLeft,
    FaCheck,
    FaTimes
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

export default function NewsLetterDataTable({ NewsLetter, loading, refetch }) {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        global: '',
        email: '',
        status: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingSubscriberId, setDeletingSubscriberId] = useState(null);
    const [togglingSubscriberId, setTogglingSubscriberId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [subscriberToDelete, setSubscriberToDelete] = useState(null);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };
    const { data: currentUser, isLoading: isCurrentuserLoading, error, isError } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/auth/me',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    })
    const handleToggleStatus = async (subscriberId, currentStatus) => {
        setTogglingSubscriberId(subscriberId);
        try {
            await axios.patch(
                `https://api.nexus.com/api/admin/newsletter/${subscriberId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Subscriber ${currentStatus ? 'deactivated' : 'activated'} successfully`, { duration: 2000 });
            refetch();
        } catch (error) {
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        } finally {
            setTogglingSubscriberId(null);
        }
    };

    const handleDeleteClick = (subscriberId) => {
        setSubscriberToDelete(subscriberId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!subscriberToDelete) return;

        setDeletingSubscriberId(subscriberToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://api.nexus.com/api/admin/newsletter/${subscriberToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Subscriber deleted successfully', { duration: 2000 });
            refetch();
        } catch (error) {
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        } finally {
            setDeletingSubscriberId(null);
            setSubscriberToDelete(null);
        }
    };

    // Filter subscribers based on all filter criteria
    const filteredSubscribers = NewsLetter?.filter(subscriber => {
        return (
            (filters.global === '' ||
                subscriber.email.toLowerCase().includes(filters.global.toLowerCase())) &&
            (filters.email === '' ||
                subscriber.email.toLowerCase().includes(filters.email.toLowerCase())) &&
            (filters.status === '' ||
                (filters.status === 'active' ? subscriber.is_active : !subscriber.is_active))
        );
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredSubscribers.length / rowsPerPage);
    const paginatedSubscribers = filteredSubscribers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const statusBadge = (is_active) => {
        const statusClass = is_active
            ? 'bg-[#009379] text-white'
            : 'bg-[#930002] text-white';
        return (
            <span className={`flex justify-center w-fit items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClass} min-w-16 text-center`}>
                {is_active ? 'Active' : 'Inactive'}
            </span>
        );
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredSubscribers.length)} of {filteredSubscribers.length} entries
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1 disabled:opacity-50"
                    >
                        <FaChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 disabled:opacity-50"
                    >
                        <FaChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="shadow-2xl rounded-2xl overflow-hidden bg-white">
            {/* Global Search */}
            <div className="p-4 border-b">
                <input
                    type="text"
                    value={filters.global}
                    onChange={(e) => handleFilterChange('global', e.target.value)}
                    placeholder="Search subscribers..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    placeholder="Email"
                                    value={filters.email}
                                    onChange={(e) => handleFilterChange('email', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Subscribed At
                            </th>
                            {/* <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </th> */}
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading subscribers...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedSubscribers.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-3 py-4 text-center">
                                    No subscribers found
                                </td>
                            </tr>
                        ) : (
                            paginatedSubscribers.map((subscriber) => (
                                <tr key={subscriber.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="font-medium">{subscriber.email}</div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {formatDate(subscriber.created_at)}
                                    </td>
                                    {/* <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(subscriber.is_active)}
                                    </td> */}
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.permissions?.includes('remove_newsletter_subscriber') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(subscriber.id)}
                                                disabled={deletingSubscriberId === subscriber.id}
                                            >
                                                {deletingSubscriberId === subscriber.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    <FaTrashAlt size={18} />
                                                )}
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && renderPagination()}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                    <FaTrashAlt className="h-5 w-5 text-red-600" />
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-lg font-medium text-gray-900">Delete Subscriber</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this subscriber? This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}