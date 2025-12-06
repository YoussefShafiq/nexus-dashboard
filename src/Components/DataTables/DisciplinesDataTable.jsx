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
    FaFilter,
    FaSearch,
    FaToggleOn,
    FaToggleOff
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function DisciplinessDataTable({ disciplinessData, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedDiscipliness, setSelectedDiscipliness] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [filters, setFilters] = useState({
        global: '',
        title: '',
        is_active: '',
        created_by: '',
        created_from: '',
        created_to: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingDisciplineId, setDeletingDisciplineId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [disciplineToDelete, setDisciplineToDelete] = useState(null);
    const [togglingDisciplineId, setTogglingDisciplineId] = useState(null);

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDiscipline, setSelectedDiscipline] = useState(null);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        is_active: true
    });

    // Fetch current user for permissions
    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/public/api/admin/auth/profile',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    });

    // Fetch individual discipline details
    const { data: disciplineDetails, isLoading: isDisciplineLoading, refetch: refetchDiscipline } = useQuery({
        queryKey: ['discipline', selectedDiscipline],
        queryFn: () => {
            if (!selectedDiscipline) return Promise.resolve(null);
            return axios.get(
                `https://nexus-consults.com/api/public/api/admin/disciplines/${selectedDiscipline}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ).then(res => res.data.data);
        },
        enabled: !!selectedDiscipline,
    });

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleDeleteClick = (disciplineId) => {
        setDisciplineToDelete(disciplineId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!disciplineToDelete) return;

        setDeletingDisciplineId(disciplineToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/public/api/admin/disciplines/${disciplineToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Discipline deleted successfully', { duration: 2000 });
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
            setDeletingDisciplineId(null);
            setDisciplineToDelete(null);
        }
    };

    const handleViewDetails = (discipline) => {
        setSelectedDiscipline(discipline);
        setShowDetailsModal(true);
    };

    const handleAddNew = () => {
        setIsEditing(false);
        setFormData({
            title: '',
            description: '',
            is_active: true
        });
        setShowAddEditModal(true);
    };

    const handleEdit = (discipline) => {
        setSelectedDiscipline(discipline.id);
        setIsEditing(true);
        // Set initial form data immediately from the row data
        setFormData({
            title: discipline.title || '',
            description: discipline.description || '',
            is_active: discipline.is_active || false
        });
        setShowAddEditModal(true);
    };

    // Set form data when editing and discipline details are loaded
    useEffect(() => {
        if (isEditing && disciplineDetails) {
            setFormData(prev => ({
                ...prev,
                title: disciplineDetails.title || prev.title,
                description: disciplineDetails.description || prev.description,
                is_active: disciplineDetails.is_active || prev.is_active
            }));
        }
    }, [isEditing, disciplineDetails]);

    const createDisciplineMutation = useMutation({
        mutationFn: (formData) => {
            return axios.post(
                'https://nexus-consults.com/api/public/api/admin/disciplines',
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('Discipline created successfully');
            setShowAddEditModal(false);
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create discipline');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    const updateDisciplineMutation = useMutation({
        mutationFn: ({ disciplineId, formData }) => {
            return axios.put(
                `https://nexus-consults.com/api/public/api/admin/disciplines/${disciplineId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('Discipline updated successfully');
            setShowAddEditModal(false);
            refetch();
            refetchDiscipline();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update discipline');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: (disciplineId) =>
            axios.patch(
                `https://nexus-consults.com/api/public/api/admin/disciplines/${disciplineId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ),
        onMutate: (disciplineId) => {
            setTogglingDisciplineId(disciplineId);
        },
        onSuccess: () => {
            toast.success('Status updated successfully');
            refetch();
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
        },
        onSettled: () => {
            setTogglingDisciplineId(null);
        }
    });

    const handleToggleStatus = (disciplineId, currentStatus) => {
        toggleStatusMutation.mutate(disciplineId);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!formData.title) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (isEditing) {
            updateDisciplineMutation.mutate({
                disciplineId: selectedDiscipline,
                formData
            });
        } else {
            createDisciplineMutation.mutate(formData);
        }
    };

    // Filter disciplines based on all filter criteria
    const filteredDiscipliness = disciplinessData?.filter(discipline => {
        const matchesGlobal =
            filters.global === '' ||
            discipline.title?.toLowerCase().includes(filters.global.toLowerCase()) ||
            discipline.description?.toLowerCase().includes(filters.global.toLowerCase()) ||
            discipline.created_by?.toLowerCase().includes(filters.global.toLowerCase());

        const matchesTitle = filters.title === '' ||
            discipline.title?.toLowerCase().includes(filters.title.toLowerCase());

        const matchesCreatedBy = filters.created_by === '' ||
            discipline.created_by?.toLowerCase().includes(filters.created_by.toLowerCase());

        const matchesStatus = filters.is_active === '' ||
            discipline.is_active?.toString() === filters.is_active;

        // Date range filter on created_at
        let matchesDate = true;
        if (discipline.created_at) {
            const createdDate = new Date(discipline.created_at);
            if (filters.created_from) {
                const start = new Date(`${filters.created_from}T00:00:00`);
                if (createdDate < start) matchesDate = false;
            }
            if (matchesDate && filters.created_to) {
                const end = new Date(`${filters.created_to}T23:59:59.999`);
                if (createdDate > end) matchesDate = false;
            }
        }

        return matchesGlobal && matchesTitle && matchesCreatedBy && matchesStatus && matchesDate;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredDiscipliness.length / rowsPerPage);
    const paginatedDiscipliness = filteredDiscipliness.slice(
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

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredDiscipliness.length)} of {filteredDiscipliness.length} entries
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

    // Handle individual discipline selection
    const handleSelectDiscipline = (disciplineId, isSelected) => {
        if (isSelected) {
            setSelectedDiscipliness(prev => [...prev, disciplineId]);
        } else {
            setSelectedDiscipliness(prev => prev.filter(id => id !== disciplineId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedDiscipliness(filteredDiscipliness.map(discipline => discipline.id));
            setSelectAll(true);
        } else {
            setSelectedDiscipliness([]);
            setSelectAll(false);
        }
    };

    // Bulk delete disciplines
    const handleBulkDelete = async () => {
        if (!selectedDiscipliness.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/public/api/admin/disciplines/bulk/delete',
                { ids: selectedDiscipliness },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedDiscipliness.length} discipline(s) deleted successfully`);
            setSelectedDiscipliness([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting disciplines:', error);
            toast.error(error.response?.data?.message || 'Failed to delete disciplines');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    return (
        <div className="shadow-2xl rounded-2xl overflow-hidden bg-white">
            {/* Header with Add Button */}
            <div className="p-4 border-b flex justify-between items-center gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={filters.global}
                        onChange={(e) => handleFilterChange('global', e.target.value)}
                        placeholder="Search disciplines..."
                        className="pl-10 pr-4 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                    />
                </div>
                {currentUser?.data?.data?.admin?.permissions?.includes('create_disciplines') && (
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-darkBlue transition-all"
                    >
                        <FaPlus size={16} />
                        Add Discipline
                    </button>
                )}
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
                                        checked={selectAll && filteredDiscipliness.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Title</span>
                                </div>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.is_active}
                                    onChange={(e) => handleFilterChange('is_active', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Status</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    value={filters.created_by}
                                    onChange={(e) => handleFilterChange('created_by', e.target.value)}
                                    placeholder="Created By"
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created Date
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
                                        Loading disciplines...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedDiscipliness.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-3 py-4 text-center">
                                    No disciplines found
                                </td>
                            </tr>
                        ) : (
                            paginatedDiscipliness.map((discipline) => (
                                <tr key={discipline.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedDiscipliness.includes(discipline.id)}
                                                onChange={(e) => handleSelectDiscipline(discipline.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <div className="ml-2">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {discipline.title}
                                                </div>
                                                {discipline.description && (
                                                    <div className="text-xs text-gray-500 truncate max-w-xs">
                                                        {discipline.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(discipline.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {discipline.created_by || '-'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {discipline.created_at ? new Date(discipline.created_at).toLocaleDateString() : '-'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => handleViewDetails(discipline)}
                                                title="View Details"
                                            >
                                                <FaEye size={16} />
                                            </button>

                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_disciplines') && (
                                                <>
                                                    <button
                                                        className="text-purple-500 hover:text-purple-700 p-1"
                                                        onClick={() => handleEdit(discipline)}
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>

                                                    <button
                                                        className={`${!discipline.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                        onClick={() => handleToggleStatus(discipline.id, discipline.is_active)}
                                                        disabled={togglingDisciplineId === discipline.id}
                                                        title={discipline.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {togglingDisciplineId === discipline.id ? (
                                                            <FaSpinner className="animate-spin" size={16} />
                                                        ) : (
                                                            !discipline.is_active ? <FaTimes /> : <FaCheck />
                                                        )}
                                                    </button>
                                                </>
                                            )}

                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_disciplines') && (
                                                <button
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    onClick={() => handleDeleteClick(discipline.id)}
                                                    disabled={deletingDisciplineId === discipline.id}
                                                    title="Delete"
                                                >
                                                    {deletingDisciplineId === discipline.id ? (
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
            {selectedDiscipliness.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedDiscipliness.length} discipline(s) selected
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
                                    setSelectedDiscipliness([]);
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

            {/* Discipline Details Modal */}
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
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Discipline Details</h3>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {selectedDiscipline ? (
                                <div className="space-y-6">
                                    {/* Information */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Title</label>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{selectedDiscipline.title}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Description</label>
                                            <p className="mt-1 text-sm text-gray-900">
                                                {selectedDiscipline.description || 'No description provided'}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                                <div className="mt-1">
                                                    {statusBadge(selectedDiscipline.is_active)}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Created By</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {selectedDiscipline.created_by || '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Created On</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {new Date(selectedDiscipline.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {new Date(selectedDiscipline.updated_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Failed to load discipline details
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Add/Edit Discipline Modal */}
            {showAddEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <button onClick={() => {
                        setShowAddEditModal(false);
                    }} className='fixed top-5 right-5 text-red-500 backdrop-blur-lg rounded-full z-50' >
                        <XCircle className='' size={40} />
                    </button>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {isEditing ? 'Edit Discipline' : 'Add New Discipline'}
                                </h3>
                                <button
                                    onClick={() => setShowAddEditModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit}>
                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md focus:outline-primary"
                                            placeholder="Enter discipline title"
                                            required
                                        />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md focus:outline-primary"
                                            placeholder="Enter discipline description"
                                            rows={4}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Provide a detailed description of the discipline (optional)
                                        </p>
                                    </div>

                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddEditModal(false)}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createDisciplineMutation.isPending || updateDisciplineMutation.isPending}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {(createDisciplineMutation.isPending || updateDisciplineMutation.isPending) ? (
                                            <>
                                                <FaSpinner className="animate-spin" />
                                                {isEditing ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            isEditing ? 'Update Discipline' : 'Create Discipline'
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Discipline</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this discipline? This action cannot be undone.
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