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
    FaSearch,
    FaImage,
    FaToggleOn,
    FaToggleOff,
    FaStar
} from 'react-icons/fa';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function TestmonialsDataTable({ testmonialsData, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedTestmonials, setSelectedTestmonials] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [filters, setFilters] = useState({
        global: '',
        name: '',
        title: '',
        is_active: '',
        created_from: '',
        created_to: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingTestmonialId, setDeletingTestmonialId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [testmonialToDelete, setTestmonialToDelete] = useState(null);
    const [togglingTestmonialId, setTogglingTestmonialId] = useState(null);

    // Modal states
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTestmonial, setSelectedTestmonial] = useState(null);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        title: '',
        message: '',
        image: null,
        imagePreview: ''
    });

    // File input ref
    const fileInputRef = useRef(null);

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

    // Fetch individual testimonial details
    const { data: testmonialDetails, isLoading: isTestmonialLoading, refetch: refetchTestmonial } = useQuery({
        queryKey: ['testmonial', selectedTestmonial],
        queryFn: () => {
            if (!selectedTestmonial) return Promise.resolve(null);
            return axios.get(
                `https://nexus-consults.com/api/public/api/admin/feedbacks/${selectedTestmonial}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ).then(res => res.data.data);
        },
        enabled: !!selectedTestmonial,
    });

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleDeleteClick = (testmonialId) => {
        setTestmonialToDelete(testmonialId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!testmonialToDelete) return;

        setDeletingTestmonialId(testmonialToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/public/api/admin/feedbacks/${testmonialToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Testimonial deleted successfully', { duration: 2000 });
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
            setDeletingTestmonialId(null);
            setTestmonialToDelete(null);
        }
    };

    const handleViewDetails = (testmonial) => {
        setSelectedTestmonial(testmonial);
        setShowDetailsModal(true);
    };

    const handleAddNew = () => {
        setIsEditing(false);
        setFormData({
            name: '',
            title: '',
            message: '',
            image: null,
            imagePreview: ''
        });
        setShowAddEditModal(true);
    };

    const handleEdit = (testmonial) => {
        setSelectedTestmonial(testmonial.id);
        setIsEditing(true);
        // Set initial form data immediately from the row data
        setFormData({
            name: testmonial.name || '',
            title: testmonial.title || '',
            message: testmonial.message || '',
            image: null,
            imagePreview: testmonial.image || ''
        });
        setShowAddEditModal(true);
    };

    // Set form data when editing and testmonial details are loaded (for additional data if needed)
    useEffect(() => {
        if (isEditing && testmonialDetails) {
            setFormData(prev => ({
                ...prev,
                name: testmonialDetails.name || prev.name,
                title: testmonialDetails.title || prev.title,
                message: testmonialDetails.message || prev.message,
                imagePreview: testmonialDetails.image || prev.imagePreview
            }));
        }
    }, [isEditing, testmonialDetails]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image size should be less than 5MB');
                return;
            }

            setFormData(prev => ({
                ...prev,
                image: file,
                imagePreview: URL.createObjectURL(file)
            }));
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({
            ...prev,
            image: null,
            imagePreview: ''
        }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const createTestmonialMutation = useMutation({
        mutationFn: (formData) => {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('title', formData.title);
            data.append('message', formData.message);
            if (formData.image) {
                data.append('image', formData.image);
            }

            return axios.post(
                'https://nexus-consults.com/api/public/api/admin/feedbacks',
                data,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('Testimonial created successfully');
            setShowAddEditModal(false);
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create testimonial');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    const updateTestmonialMutation = useMutation({
        mutationFn: ({ testmonialId, formData }) => {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('title', formData.title);
            data.append('message', formData.message);
            if (formData.image) {
                data.append('image', formData.image);
            }
            data.append('_method', 'PUT');

            return axios.post(
                `https://nexus-consults.com/api/public/api/admin/feedbacks/${testmonialId}`,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('Testimonial updated successfully');
            setShowAddEditModal(false);
            refetch();
            refetchTestmonial();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update testimonial');
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
        mutationFn: (testmonialId) =>
            axios.patch(
                `https://nexus-consults.com/api/public/api/admin/feedbacks/${testmonialId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ),
        onMutate: (testmonialId) => {
            setTogglingTestmonialId(testmonialId);
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
            setTogglingTestmonialId(null);
        }
    });

    const handleToggleStatus = (testmonialId, currentStatus) => {
        toggleStatusMutation.mutate(testmonialId);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        if (!formData.name || !formData.title || !formData.message) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (isEditing) {
            updateTestmonialMutation.mutate({
                testmonialId: selectedTestmonial,
                formData
            });
        } else {
            createTestmonialMutation.mutate(formData);
        }
    };

    // Filter testimonials based on all filter criteria
    const filteredTestmonials = testmonialsData?.filter(testmonial => {
        const matchesGlobal =
            filters.global === '' ||
            testmonial.name?.toLowerCase().includes(filters.global.toLowerCase()) ||
            testmonial.title?.toLowerCase().includes(filters.global.toLowerCase()) ||
            testmonial.message?.toLowerCase().includes(filters.global.toLowerCase());

        const matchesName = filters.name === '' ||
            testmonial.name?.toLowerCase().includes(filters.name.toLowerCase());

        const matchesTitle = filters.title === '' ||
            testmonial.title?.toLowerCase().includes(filters.title.toLowerCase());

        const matchesStatus = filters.is_active === '' ||
            testmonial.is_active?.toString() === filters.is_active;

        // Date range filter on created_at
        let matchesDate = true;
        if (testmonial.created_at) {
            const createdDate = new Date(testmonial.created_at);
            if (filters.created_from) {
                const start = new Date(`${filters.created_from}T00:00:00`);
                if (createdDate < start) matchesDate = false;
            }
            if (matchesDate && filters.created_to) {
                const end = new Date(`${filters.created_to}T23:59:59.999`);
                if (createdDate > end) matchesDate = false;
            }
        }

        return matchesGlobal && matchesName && matchesTitle && matchesStatus && matchesDate;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredTestmonials.length / rowsPerPage);
    const paginatedTestmonials = filteredTestmonials.slice(
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
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredTestmonials.length)} of {filteredTestmonials.length} entries
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

    // Handle individual testimonial selection
    const handleSelectTestmonial = (testmonialId, isSelected) => {
        if (isSelected) {
            setSelectedTestmonials(prev => [...prev, testmonialId]);
        } else {
            setSelectedTestmonials(prev => prev.filter(id => id !== testmonialId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedTestmonials(filteredTestmonials.map(testmonial => testmonial.id));
            setSelectAll(true);
        } else {
            setSelectedTestmonials([]);
            setSelectAll(false);
        }
    };

    // Bulk delete testimonials
    const handleBulkDelete = async () => {
        if (!selectedTestmonials.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/public/api/admin/feedbacks/bulk/delete',
                { ids: selectedTestmonials },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedTestmonials.length} testimonial(s) deleted successfully`);
            setSelectedTestmonials([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting testimonials:', error);
            toast.error(error.response?.data?.message || 'Failed to delete testimonials');
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
                        placeholder="Search testimonials..."
                        className="pl-10 pr-4 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                    />
                </div>
                {currentUser?.data?.data?.admin?.permissions?.includes('create_feedbacks') && (
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-darkBlue transition-all"
                    >
                        <FaPlus size={16} />
                        Add Testimonial
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
                                        checked={selectAll && filteredTestmonials.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Name</span>
                                </div>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    value={filters.title}
                                    onChange={(e) => handleFilterChange('title', e.target.value)}
                                    placeholder="Title"
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Message
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
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading testimonials...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedTestmonials.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    No testimonials found
                                </td>
                            </tr>
                        ) : (
                            paginatedTestmonials.map((testmonial) => (
                                <tr key={testmonial.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedTestmonials.includes(testmonial.id)}
                                                onChange={(e) => handleSelectTestmonial(testmonial.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <div className="ml-2 flex items-center gap-3">
                                                <img
                                                    src={testmonial.image}
                                                    alt={testmonial.name}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {testmonial.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {testmonial.title}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4">
                                        <div className="text-sm text-gray-900 line-clamp-2 max-w-xs">
                                            {testmonial.message}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(testmonial.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {testmonial.created_at ? new Date(testmonial.created_at).toLocaleDateString() : '-'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => handleViewDetails(testmonial)}
                                                title="View Details"
                                            >
                                                <FaEye size={16} />
                                            </button>

                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_feedbacks') && (
                                                <>
                                                    <button
                                                        className="text-purple-500 hover:text-purple-700 p-1"
                                                        onClick={() => handleEdit(testmonial)}
                                                        title="Edit"
                                                    >
                                                        <FaEdit size={16} />
                                                    </button>

                                                    <button
                                                        className={`${testmonial.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                        onClick={() => handleToggleStatus(testmonial.id, testmonial.is_active)}
                                                        disabled={togglingTestmonialId === testmonial.id}
                                                        title={testmonial.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {togglingTestmonialId === testmonial.id ? (
                                                            <FaSpinner className="animate-spin" size={16} />
                                                        ) : (
                                                            testmonial.is_active ? <FaTimes /> : <FaCheck />
                                                        )}
                                                    </button>
                                                </>
                                            )}

                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_feedbacks') && (
                                                <button
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    onClick={() => handleDeleteClick(testmonial.id)}
                                                    disabled={deletingTestmonialId === testmonial.id}
                                                    title="Delete"
                                                >
                                                    {deletingTestmonialId === testmonial.id ? (
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
            {selectedTestmonials.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedTestmonials.length} testimonial(s) selected
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
                                    setSelectedTestmonials([]);
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

            {/* Testimonial Details Modal */}
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
                                <h3 className="text-xl font-bold text-gray-900">Testimonial Details</h3>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {selectedTestmonial ? (
                                <div className="space-y-6">
                                    {/* Image */}
                                    <div className="flex justify-center">
                                        <img
                                            src={selectedTestmonial.image}
                                            alt={selectedTestmonial.name}
                                            className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"
                                        />
                                    </div>

                                    {/* Information */}
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Name</label>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{selectedTestmonial.name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Title</label>
                                            <p className="mt-1 text-md text-gray-900">{selectedTestmonial.title}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Message</label>
                                            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                                                {selectedTestmonial.message}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                                <div className="mt-1">
                                                    {statusBadge(selectedTestmonial.is_active)}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Created On</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {new Date(selectedTestmonial.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    Failed to load testimonial details
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Add/Edit Testimonial Modal */}
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
                                    {isEditing ? 'Edit Testimonial' : 'Add New Testimonial'}
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
                                    {/* Image Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Profile Image
                                        </label>
                                        <div className="flex items-center gap-4">
                                            {formData.imagePreview ? (
                                                <div className="relative">
                                                    <img
                                                        src={formData.imagePreview}
                                                        alt="Preview"
                                                        className="h-20 w-20 rounded-full object-cover border"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveImage}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                    >
                                                        <FaTimes size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="h-20 w-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                                                    <FaImage className="text-gray-400" size={24} />
                                                </div>
                                            )}
                                            <div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={handleImageChange}
                                                    accept="image/*"
                                                    className="hidden"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                    Choose Image
                                                </button>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    PNG, JPG, JPEG up to 5MB
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-3 py-2 border rounded-md focus:outline-primary"
                                            placeholder="Enter full name"
                                            required
                                        />
                                    </div>

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
                                            placeholder="e.g., CEO at Company"
                                            required
                                        />
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Message *
                                        </label>
                                        <textarea
                                            value={formData.message}
                                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                            rows={6}
                                            className="w-full px-3 py-2 border rounded-md focus:outline-primary resize-vertical"
                                            placeholder="Enter testimonial message"
                                            required
                                        />
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
                                        disabled={createTestmonialMutation.isPending || updateTestmonialMutation.isPending}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {(createTestmonialMutation.isPending || updateTestmonialMutation.isPending) ? (
                                            <>
                                                <FaSpinner className="animate-spin" />
                                                {isEditing ? 'Updating...' : 'Creating...'}
                                            </>
                                        ) : (
                                            isEditing ? 'Update Testimonial' : 'Create Testimonial'
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Testimonial</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this testimonial? This action cannot be undone.
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