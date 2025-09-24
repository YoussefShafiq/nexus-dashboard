import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCopy, FiChevronRight, FiChevronLeft, FiExternalLink } from 'react-icons/fi';
import { FaSpinner } from 'react-icons/fa';
import toast from 'react-hot-toast';

export default function DemoRequestsDataTable({ demoRequests, loading, refetch }) {
    const [filters, setFilters] = useState({
        global: '',
        name: '',
        email: '',
        status: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text || '');
        toast.success('Copied to clipboard', { duration: 2000 });
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const statusBadge = (status) => {
        const statusClasses = {
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            completed: 'bg-blue-100 text-blue-800'
        };

        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // Filter demo requests based on all filter criteria
    const filteredRequests = demoRequests?.filter(request => {
        return (
            (filters.global === '' ||
                request.full_name.toLowerCase().includes(filters.global.toLowerCase()) ||
                request.email.toLowerCase().includes(filters.global.toLowerCase())) &&
            (filters.name === '' ||
                request.full_name.toLowerCase().includes(filters.name.toLowerCase())) &&
            (filters.email === '' ||
                request.email.toLowerCase().includes(filters.email.toLowerCase())) &&
            (filters.status === '' ||
                request.status.toLowerCase().includes(filters.status.toLowerCase()))
        );
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredRequests.length / rowsPerPage);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredRequests.length)} of {filteredRequests.length} entries
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="p-1 disabled:opacity-50"
                    >
                        <FiChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-1">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1 disabled:opacity-50"
                    >
                        <FiChevronRight className="h-4 w-4" />
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
                    placeholder="Search demo requests..."
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
                                    placeholder="Name"
                                    value={filters.name}
                                    onChange={(e) => handleFilterChange('name', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
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
                                Scheduled Time
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading demo requests...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedRequests.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-3 py-4 text-center">
                                    No demo requests found
                                </td>
                            </tr>
                        ) : (
                            paginatedRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="font-medium">{request.full_name}</div>
                                        <div className="text-gray-500 text-xs">{request.phone}</div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {request.email}
                                            <button
                                                onClick={() => handleCopy(request.email)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                title="Copy email"
                                            >
                                                <FiCopy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {request.formatted_datetime}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(request.status)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                setSelectedRequest(request);
                                                setShowDetailsModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 p-1 flex items-center gap-1"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!loading && renderPagination()}

            {/* Details Modal */}
            {showDetailsModal && selectedRequest && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDetailsModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Demo Request Details</h3>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Full Name</h4>
                                        <p className="mt-1 text-sm text-gray-900">{selectedRequest.full_name}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Email</h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-sm text-gray-900">{selectedRequest.email}</p>
                                            <button
                                                onClick={() => handleCopy(selectedRequest.email)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                title="Copy email"
                                            >
                                                <FiCopy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            <p className="text-sm text-gray-900">{selectedRequest.phone}</p>
                                            <button
                                                onClick={() => handleCopy(selectedRequest.phone)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                title="Copy phone"
                                            >
                                                <FiCopy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Real Estate Experience</h4>
                                        <p className="mt-1 text-sm text-gray-900">{selectedRequest.real_estate_experience}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Monthly Budget</h4>
                                        <p className="mt-1 text-sm text-gray-900">{selectedRequest.monthly_budget}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Scheduled Time</h4>
                                        <p className="mt-1 text-sm text-gray-900">{selectedRequest.formatted_datetime}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                                        <div className="mt-1">
                                            {statusBadge(selectedRequest.status)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-500">Google Meet Link</h4>
                                        <div className="flex items-center gap-1 mt-1">
                                            <a
                                                href={selectedRequest.google_meet_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                            >
                                                Join Meeting <FiExternalLink className="h-3 w-3" />
                                            </a>
                                            <button
                                                onClick={() => handleCopy(selectedRequest.google_meet_link)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                title="Copy meeting link"
                                            >
                                                <FiCopy className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t">
                                <h4 className="text-sm font-medium text-gray-500 mb-2">Additional Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-500">Created At</h5>
                                        <p className="mt-1 text-xs text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-medium text-gray-500">Last Updated</h5>
                                        <p className="mt-1 text-xs text-gray-900">{formatDate(selectedRequest.updated_at)}</p>
                                    </div>
                                    {selectedRequest.failure_reason && (
                                        <div className="md:col-span-2">
                                            <h5 className="text-xs font-medium text-gray-500">Failure Reason</h5>
                                            <p className="mt-1 text-xs text-gray-900">{selectedRequest.failure_reason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}