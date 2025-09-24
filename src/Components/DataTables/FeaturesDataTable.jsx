import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FaSpinner,
    FaPlus,
    FaTrashAlt,
    FaEdit,
    FaChevronRight,
    FaChevronLeft,
    FaCheck,
    FaTimes,
    FaLock,
    FaLockOpen
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

export default function FeaturesDataTable({ features, loading, refetch }) {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        global: '',
        name: '',
        key: '',
        type: '',
        category: '',
        status: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingFeatureId, setDeletingFeatureId] = useState(null);
    const [togglingFeatureId, setTogglingFeatureId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [featureToDelete, setFeatureToDelete] = useState(null);
    const [updatingFeature, setUpdatingFeature] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        type: 'text',
        isAdditionalUsageCharge: false,
        status: 'active'
    });

    const [editFormData, setEditFormData] = useState({
        id: null,
        name: '',
        type: 'text',
        isAdditionalUsageCharge: false,
        status: 'active'
    });

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
    const handleToggleStatus = async (featureId, currentStatus) => {
        setTogglingFeatureId(featureId);
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await axios.patch(
                `https://api.nexus.com/api/admin/features/${featureId}/toggle-status`,
                { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Feature ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, { duration: 2000 });
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
            setTogglingFeatureId(null);
        }
    };

    const handleDeleteClick = (featureId) => {
        setFeatureToDelete(featureId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!featureToDelete) return;

        setDeletingFeatureId(featureToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://api.nexus.com/api/admin/features/${featureToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Feature deleted successfully', { duration: 2000 });
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
            setDeletingFeatureId(null);
            setFeatureToDelete(null);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEditFormChange = (e) => {
        const { name, value, type, checked } = e.target;

        setEditFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'text',
            isAdditionalUsageCharge: false,
            status: 'active'
        });
    };

    const prepareEditForm = (feature) => {
        setEditFormData({
            id: feature.id,
            name: feature.name,
            type: feature.type,
            isAdditionalUsageCharge: feature.category === 'additional_usage_charge',
            status: feature.status || 'active'
        });
        setShowEditModal(true);
    };

    const handleAddFeature = async (e) => {
        e.preventDefault();

        setUpdatingFeature(true);
        try {
            const payload = {
                key: formData.name.replace(' ', '_'),
                name: formData.name,
                type: formData.type,
                category: formData.isAdditionalUsageCharge ? 'additional_usage_charge' : null,
                status: formData.status
            };

            await axios.post(
                'https://api.nexus.com/api/admin/features',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            setUpdatingFeature(false);
            toast.success('Feature added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
        } catch (error) {
            setUpdatingFeature(false);
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        }
    };

    const handleUpdateFeature = async (e) => {
        e.preventDefault();

        setUpdatingFeature(true);
        try {
            const payload = {
                name: editFormData.name,
                type: editFormData.type,
                category: editFormData.isAdditionalUsageCharge ? 'additional_usage_charge' : null,
                status: editFormData.status
            };

            await axios.put(
                `https://api.nexus.com/api/admin/features/${editFormData.id}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            setUpdatingFeature(false);
            toast.success('Feature updated successfully', { duration: 2000 });
            setShowEditModal(false);
            refetch();
        } catch (error) {
            setUpdatingFeature(false);
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        }
    };

    // Filter features based on all filter criteria
    const filteredFeatures = features?.filter(feature => {
        return (
            (filters.global === '' ||
                feature.name.toLowerCase().includes(filters.global.toLowerCase()) ||
                feature.key.toLowerCase().includes(filters.global.toLowerCase())) &&
            (filters.name === '' ||
                feature.name.toLowerCase().includes(filters.name.toLowerCase())) &&
            (filters.key === '' ||
                feature.key.toLowerCase().includes(filters.key.toLowerCase())) &&
            (filters.type === '' || feature.type.includes(filters.type.toLowerCase())) &&
            (filters.category === '' ||
                (filters.category === 'additional_usage_charge' ?
                    feature.category === 'additional_usage_charge' :
                    feature.category === null)) &&
            (filters.status === '' || (feature.status || 'active').includes(filters.status.toLowerCase()))
        );
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredFeatures.length / rowsPerPage);
    const paginatedFeatures = filteredFeatures.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const categoryBadge = (category) => {
        if (category === 'additional_usage_charge') {
            return (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded">
                    Additional Usage Charge
                </span>
            );
        }
        return (
            <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded">
                General
            </span>
        );
    };

    const typeBadge = (type) => {
        const color = type === 'text' ? 'blue' : 'purple';
        return (
            <span className={`bg-${color}-100 text-${color}-800 text-xs font-medium px-2.5 py-1 rounded capitalize`}>
                {type}
            </span>
        );
    };

    const statusBadge = (is_active) => {
        let status = ''
        if (is_active == true) {
            status = 'active'
        } else {
            status = 'inactive'
        }
        const statusClass = (status || 'active') === 'active'
            ? 'bg-[#009379] text-white'
            : 'bg-[#930002] text-white';
        return (
            <span className={`flex justify-center w-fit items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClass} min-w-16 text-center`}>
                {(status || 'active') === 'active' ? 'Active' : 'Inactive'}
            </span>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredFeatures.length)} of {filteredFeatures.length} entries
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
            {/* Global Search and Add Button */}
            <div className="p-4 border-b flex justify-between items-center gap-4">
                <input
                    type="text"
                    value={filters.global}
                    onChange={(e) => handleFilterChange('global', e.target.value)}
                    placeholder="Search features..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.permissions?.includes('create_feature') && <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Feature</span>
                </button>}
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
                                    placeholder="Key"
                                    value={filters.key}
                                    onChange={(e) => handleFilterChange('key', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Types</option>
                                    <option value="text">Text</option>
                                    <option value="boolean">Boolean</option>
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Categories</option>
                                    <option value="additional_usage_charge">Additional Usage Charge</option>
                                    <option value="general">General</option>
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
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
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading features...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedFeatures.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    No features found
                                </td>
                            </tr>
                        ) : (
                            paginatedFeatures.map((feature) => (
                                <tr key={feature.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="font-medium">{feature.name}</div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {feature.key}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {typeBadge(feature.type)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {categoryBadge(feature.category)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(feature.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.permissions?.includes('edit_feature') && <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => prepareEditForm(feature)}
                                            >
                                                <FaEdit size={18} />
                                            </button>}
                                            {feature.is_active ? <>
                                                <button
                                                    className={`${(feature.status || 'active') === 'active' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                    onClick={() => handleToggleStatus(feature.id, feature.status || 'active')}
                                                    disabled={togglingFeatureId === feature.id}
                                                >
                                                    {togglingFeatureId === feature.id ? (
                                                        <FaSpinner className="animate-spin" size={18} />
                                                    ) : (
                                                        (feature.status || 'active') === 'active' ? <FaTimes /> : <FaCheck />
                                                    )}
                                                </button>
                                            </> : <>
                                                <button
                                                    className={`${feature.status === 'active' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                    onClick={() => handleToggleStatus(feature.id, feature.status)}
                                                    disabled={togglingFeatureId === feature.id}
                                                >
                                                    {togglingFeatureId === feature.id ? (
                                                        <FaSpinner className="animate-spin" size={18} />
                                                    ) : (
                                                        feature.status === 'active' ? <FaTimes /> : <FaCheck />
                                                    )}
                                                </button>
                                            </>}

                                            {currentUser?.data?.data?.permissions?.includes('delete_feature') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(feature.id)}
                                                disabled={deletingFeatureId === feature.id}
                                            >
                                                {deletingFeatureId === feature.id ? (
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

            {/* Add Feature Modal */}
            {showAddModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowAddModal(false)}
                >
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Feature</h2>
                            <form onSubmit={handleAddFeature}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        <option value="text">Text</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                </div>

                                {/* <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div> */}

                                <div className="mb-4 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="isAdditionalUsageCharge"
                                        name="isAdditionalUsageCharge"
                                        checked={formData.isAdditionalUsageCharge}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isAdditionalUsageCharge" className="ml-2 text-sm text-gray-700">
                                        Additional Usage Charge
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                        disabled={updatingFeature}
                                    >
                                        {updatingFeature ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Feature</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Feature Modal */}
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowEditModal(false)}
                >
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Edit Feature</h2>
                            <form onSubmit={handleUpdateFeature}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={editFormData.name}
                                        onChange={handleEditFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        name="type"
                                        value={editFormData.type}
                                        onChange={handleEditFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        <option value="text">Text</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                </div>

                                {/* <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        name="status"
                                        value={editFormData.status}
                                        onChange={handleEditFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div> */}

                                <div className="mb-4 flex items-center">
                                    <input
                                        type="checkbox"
                                        id="editIsAdditionalUsageCharge"
                                        name="isAdditionalUsageCharge"
                                        checked={editFormData.isAdditionalUsageCharge}
                                        onChange={handleEditFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="editIsAdditionalUsageCharge" className="ml-2 text-sm text-gray-700">
                                        Additional Usage Charge
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                        disabled={updatingFeature}
                                    >
                                        {updatingFeature ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaCheck size={18} />
                                                <span>Update Feature</span>
                                            </>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Feature</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this feature? This action cannot be undone.
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