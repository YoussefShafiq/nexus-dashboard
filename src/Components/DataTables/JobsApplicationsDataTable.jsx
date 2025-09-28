import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaSpinner,
    FaPlus,
    FaTrashAlt,
    FaEdit,
    FaChevronRight,
    FaChevronLeft,
    FaCheck,
    FaTimes,
    FaEye,
    FaDownload,
    FaEnvelope,
    FaPhone,
    FaBriefcase,
    FaCalendar,
    FaStickyNote,
    FaUser,
    FaFilePdf,
    FaFilter,
    FaSearch
} from 'react-icons/fa';
import DateRangePicker from '../ReusableComponents/DateRangePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export default function JobsApplicationsDataTable({ applications, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedApplications, setSelectedApplications] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [filters, setFilters] = useState({
        global: '',
        applicant_name: '',
        applicant_email: '',
        job_title: '',
        status: '',
        created_from: '',
        created_to: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingApplicationId, setDeletingApplicationId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [applicationToDelete, setApplicationToDelete] = useState(null);

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingNotes, setUpdatingNotes] = useState(false);

    // Form states
    const [statusForm, setStatusForm] = useState({
        status: ''
    });
    const [notesForm, setNotesForm] = useState({
        notes: ''
    });

    // Fetch status options
    const { data: statusOptions } = useQuery({
        queryKey: ['applicationStatusOptions'],
        queryFn: () =>
            axios.get('https://nexus-consults.com/api/admin/job-applications/status-options', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }).then(res => res.data.data),
        staleTime: 5 * 60 * 1000,
    });

    // Fetch current user for permissions
    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/admin/auth/profile',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    });

    // Fetch individual application details
    const { data: applicationDetails, isLoading: isApplicationLoading, refetch: refetchApplication } = useQuery({
        queryKey: ['application', selectedApplication],
        queryFn: () => {
            if (!selectedApplication) return Promise.resolve(null);
            return axios.get(
                `https://nexus-consults.com/api/admin/job-applications/${selectedApplication}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ).then(res => res.data.data);
        },
        enabled: !!selectedApplication,
    });

    // Get unique jobs for filter
    const uniqueJobs = [...new Set(applications?.map(app => app.job?.title).filter(Boolean))];

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleDeleteClick = (applicationId) => {
        setApplicationToDelete(applicationId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!applicationToDelete) return;

        setDeletingApplicationId(applicationToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/admin/job-applications/${applicationToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Application deleted successfully', { duration: 2000 });
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
            setDeletingApplicationId(null);
            setApplicationToDelete(null);
        }
    };

    const handleViewDetails = (applicationId) => {
        setSelectedApplication(applicationId);
        setShowDetailsModal(true);
    };

    const handleStatusUpdate = (applicationId) => {
        setSelectedApplication(applicationId);
        setStatusForm({ status: '' });
        setShowStatusModal(true);
    };

    const handleAddNotes = (applicationId) => {
        setSelectedApplication(applicationId);
        setNotesForm({ notes: applicationDetails?.admin_notes || '' });
        setShowNotesModal(true);
    };

    const updateStatusMutation = useMutation({
        mutationFn: ({ applicationId, status }) =>
            axios.patch(
                `https://nexus-consults.com/api/admin/job-applications/${applicationId}/status`,
                { status },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ),
        onSuccess: () => {
            toast.success('Status updated successfully');
            setShowStatusModal(false);
            refetch();
            refetchApplication();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update status');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    const updateNotesMutation = useMutation({
        mutationFn: ({ applicationId, notes }) =>
            axios.patch(
                `https://nexus-consults.com/api/admin/job-applications/${applicationId}/notes`,
                { admin_notes: notes },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ),
        onSuccess: () => {
            toast.success('Notes updated successfully');
            setShowNotesModal(false);
            refetchApplication();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update notes');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    const handleDownloadCV = async (applicationId) => {
        try {
            const response = await axios.get(
                `https://nexus-consults.com/api/admin/job-applications/${applicationId}/download/cv`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    },
                    responseType: 'blob'
                }
            );

            // Create blob link and download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `CV-${applicationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('CV downloaded successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to download CV');
        }
    };

    const handleStatusSubmit = (e) => {
        e.preventDefault();
        if (!statusForm.status) {
            toast.error('Please select a status');
            return;
        }
        updateStatusMutation.mutate({
            applicationId: selectedApplication,
            status: statusForm.status
        });
    };

    const handleNotesSubmit = (e) => {
        e.preventDefault();
        updateNotesMutation.mutate({
            applicationId: selectedApplication,
            notes: notesForm.notes
        });
    };

    // Filter applications based on all filter criteria
    const filteredApplications = applications?.filter(application => {
        const matchesGlobal =
            filters.global === '' ||
            application.applicant?.name?.toLowerCase().includes(filters.global.toLowerCase()) ||
            application.applicant?.email?.toLowerCase().includes(filters.global.toLowerCase()) ||
            application.job?.title?.toLowerCase().includes(filters.global.toLowerCase());

        const matchesApplicantName = filters.applicant_name === '' ||
            (application.applicant?.name?.toLowerCase().includes(filters.applicant_name.toLowerCase()));

        const matchesApplicantEmail = filters.applicant_email === '' ||
            application.applicant?.email?.toLowerCase().includes(filters.applicant_email.toLowerCase());

        const matchesJobTitle = filters.job_title === '' ||
            application.job?.title?.toLowerCase().includes(filters.job_title.toLowerCase());

        const matchesStatus = filters.status === '' || application.status === filters.status;

        // Date range filter on created_at
        let matchesDate = true;
        if (application.created_at) {
            const createdDate = new Date(application.created_at);
            if (filters.created_from) {
                const start = new Date(`${filters.created_from}T00:00:00`);
                if (createdDate < start) matchesDate = false;
            }
            if (matchesDate && filters.created_to) {
                const end = new Date(`${filters.created_to}T23:59:59.999`);
                if (createdDate > end) matchesDate = false;
            }
        }

        return matchesGlobal && matchesApplicantName && matchesApplicantEmail &&
            matchesJobTitle && matchesStatus && matchesDate;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredApplications.length / rowsPerPage);
    const paginatedApplications = filteredApplications.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const statusBadge = (status) => {
        const statusConfig = statusOptions?.statuses?.[status] || {
            label: status,
            color: 'gray'
        };

        const colorClasses = {
            yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            blue: 'bg-blue-100 text-blue-800 border-blue-200',
            purple: 'bg-purple-100 text-purple-800 border-purple-200',
            indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            green: 'bg-green-100 text-green-800 border-green-200',
            red: 'bg-red-100 text-red-800 border-red-200',
            gray: 'bg-gray-100 text-gray-800 border-gray-200'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[statusConfig.color] || colorClasses.gray}`}>
                {statusConfig.label}
            </span>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredApplications.length)} of {filteredApplications.length} entries
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

    // Handle individual application selection
    const handleSelectApplication = (applicationId, isSelected) => {
        if (isSelected) {
            setSelectedApplications(prev => [...prev, applicationId]);
        } else {
            setSelectedApplications(prev => prev.filter(id => id !== applicationId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedApplications(filteredApplications.map(app => app.id));
            setSelectAll(true);
        } else {
            setSelectedApplications([]);
            setSelectAll(false);
        }
    };

    // Bulk delete applications
    const handleBulkDelete = async () => {
        if (!selectedApplications.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/admin/job-applications/bulk/delete',
                { ids: selectedApplications },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedApplications.length} application(s) deleted successfully`);
            setSelectedApplications([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting applications:', error);
            toast.error(error.response?.data?.message || 'Failed to delete applications');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    return (
        <div className="shadow-2xl rounded-2xl overflow-hidden bg-white">
            {/* Global Search */}
            <div className="p-4 border-b flex justify-between items-center gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={filters.global}
                        onChange={(e) => handleFilterChange('global', e.target.value)}
                        placeholder="Search applications..."
                        className="pl-10 pr-4 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectAll && filteredApplications.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Applicant</span>
                                </div>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    value={filters.applicant_email}
                                    onChange={(e) => handleFilterChange('applicant_email', e.target.value)}
                                    placeholder="Email"
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.job_title}
                                    onChange={(e) => handleFilterChange('job_title', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Jobs</option>
                                    {uniqueJobs.map(job => (
                                        <option key={job} value={job}>{job}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Statuses</option>
                                    {statusOptions && Object.entries(statusOptions.statuses).map(([key, status]) => (
                                        <option key={key} value={key}>{status.label}</option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <DateRangePicker
                                    initialRange={{
                                        startDate: filters.created_from ? new Date(`${filters.created_from}T00:00:00`) : null,
                                        endDate: filters.created_to ? new Date(`${filters.created_to}T00:00:00`) : null
                                    }}
                                    onDateChange={({ startDate, endDate }) => {
                                        const toYMD = (d) => {
                                            if (!(d instanceof Date) || isNaN(d)) return '';
                                            const y = d.getFullYear();
                                            const m = String(d.getMonth() + 1).padStart(2, '0');
                                            const da = String(d.getDate()).padStart(2, '0');
                                            return `${y}-${m}-${da}`;
                                        };
                                        handleFilterChange('created_from', startDate ? toYMD(startDate) : '');
                                        handleFilterChange('created_to', endDate ? toYMD(endDate) : '');
                                    }}
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading applications...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedApplications.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    No applications found
                                </td>
                            </tr>
                        ) : (
                            paginatedApplications.map((application) => (
                                <tr key={application.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedApplications.includes(application.id)}
                                                onChange={(e) => handleSelectApplication(application.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <div className="ml-2">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {application.applicant?.name || 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <FaPhone size={10} />
                                                    {application.applicant?.phone || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1 text-sm text-gray-900">
                                            <FaEnvelope size={12} className="text-gray-400" />
                                            {application.applicant?.email}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {application.job?.title || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {application.job?.type && (
                                                <span className="flex items-center gap-1">
                                                    <FaBriefcase size={10} />
                                                    {application.job.type}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(application.status)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {application.created_at ? new Date(application.created_at).toLocaleDateString() : '-'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => handleViewDetails(application.id)}
                                                title="View Details"
                                            >
                                                <FaEye size={16} />
                                            </button>

                                            <button
                                                className="text-green-500 hover:text-green-700 p-1"
                                                onClick={() => handleDownloadCV(application.id)}
                                                title="Download CV"
                                            >
                                                <FaDownload size={16} />
                                            </button>

                                            {currentUser?.data?.data?.admin?.permissions?.includes('manage_job_applications') && (
                                                <>
                                                    <button
                                                        className="text-purple-500 hover:text-purple-700 p-1"
                                                        onClick={() => handleStatusUpdate(application.id)}
                                                        title="Update Status"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>

                                                    <button
                                                        className="text-indigo-500 hover:text-indigo-700 p-1"
                                                        onClick={() => handleAddNotes(application.id)}
                                                        title="Add Notes"
                                                    >
                                                        <FaStickyNote size={16} />
                                                    </button>
                                                </>
                                            )}

                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_job_applications') && (
                                                <button
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    onClick={() => handleDeleteClick(application.id)}
                                                    disabled={deletingApplicationId === application.id}
                                                    title="Delete"
                                                >
                                                    {deletingApplicationId === application.id ? (
                                                        <FaSpinner className="animate-spin" size={16} />
                                                    ) : (
                                                        <FaTrashAlt size={16} />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedApplications.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedApplications.length} application(s) selected
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkActionLoading}
                                className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                            >
                                <FaTrashAlt className="mr-1.5" />
                                Delete Selected
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedApplications([]);
                                    setSelectAll(false);
                                }}
                                className="flex items-center px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                            >
                                <FaTimes className="mr-1.5" />
                                Clear Selection
                            </button>

                            {isBulkActionLoading && (
                                <div className="flex items-center">
                                    <FaSpinner className="animate-spin mr-1.5" />
                                    Loading...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {!loading && renderPagination()}

            {/* Application Details Modal */}
            {showDetailsModal && (
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
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Application Details</h3>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {isApplicationLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <FaSpinner className="animate-spin mr-2" size={24} />
                                    <span>Loading application details...</span>
                                </div>
                            ) : applicationDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Applicant Information */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                            Applicant Information
                                        </h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Name</label>
                                            <p className="mt-1 text-sm text-gray-900">{applicationDetails.applicant?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Email</label>
                                            <p className="mt-1 text-sm text-gray-900">{applicationDetails.applicant?.email}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                                            <p className="mt-1 text-sm text-gray-900">{applicationDetails.applicant?.phone}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                                            <p className="mt-1 text-sm text-gray-900">{applicationDetails.applicant?.years_of_experience}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Availability</label>
                                            <p className="mt-1 text-sm text-gray-900 capitalize">
                                                {applicationDetails.applicant?.availability?.replace('_', ' ') || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Message</label>
                                            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                                                {applicationDetails.applicant?.message || 'No message provided'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Job & Application Information */}
                                    <div className="space-y-4">
                                        <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                            Job & Application Information
                                        </h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                            <p className="mt-1 text-sm text-gray-900">{applicationDetails.job?.title}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Location</label>
                                            <p className="mt-1 text-sm text-gray-900 capitalize">
                                                {applicationDetails.job?.location?.replace('-', ' ') || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Job Type</label>
                                            <p className="mt-1 text-sm text-gray-900 capitalize">
                                                {applicationDetails.job?.type?.replace('-', ' ') || 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Status</label>
                                            <div className="mt-1">
                                                {statusBadge(applicationDetails.status)}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Applied On</label>
                                            <p className="mt-1 text-sm text-gray-900">
                                                {new Date(applicationDetails.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                                            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                                                {applicationDetails.admin_notes || 'No notes added'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">CV</label>
                                            <button
                                                onClick={() => handleDownloadCV(applicationDetails.id)}
                                                className="mt-1 flex items-center gap-2 px-3 py-2 bg-primary text-white rounded hover:bg-darkBlue transition-all text-sm"
                                            >
                                                <FaFilePdf />
                                                Download CV
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Failed to load application details
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Update Status Modal */}
            {showStatusModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowStatusModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Application Status</h3>
                            <form onSubmit={handleStatusSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Status
                                    </label>
                                    <select
                                        value={statusForm.status}
                                        onChange={(e) => setStatusForm({ status: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md focus:outline-primary"
                                        required
                                    >
                                        <option value="">Choose a status</option>
                                        {statusOptions && Object.entries(statusOptions.statuses).map(([key, status]) => (
                                            <option key={key} value={key}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                    {statusForm.status && statusOptions?.statuses[statusForm.status]?.description && (
                                        <p className="mt-2 text-xs text-gray-500">
                                            {statusOptions.statuses[statusForm.status].description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowStatusModal(false)}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updateStatusMutation.isLoading}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {updateStatusMutation.isLoading ? (
                                            <>
                                                <FaSpinner className="animate-spin" />
                                                Updating...
                                            </>
                                        ) : (
                                            'Update Status'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Add Notes Modal */}
            {showNotesModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowNotesModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Admin Notes</h3>
                            <form onSubmit={handleNotesSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Notes
                                    </label>
                                    <textarea
                                        value={notesForm.notes}
                                        onChange={(e) => setNotesForm({ notes: e.target.value })}
                                        rows={6}
                                        className="w-full px-3 py-2 border rounded-md focus:outline-primary resize-vertical"
                                        placeholder="Enter your notes about this application..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowNotesModal(false)}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updateNotesMutation.isLoading}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {updateNotesMutation.isLoading ? (
                                            <>
                                                <FaSpinner className="animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Notes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Application</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this application? This action cannot be undone.
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