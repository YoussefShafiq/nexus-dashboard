import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    FaCheck,
    FaSpinner,
    FaPlus,
    FaTrashAlt,
    FaTimes,
    FaEdit,
    FaImage,
    FaChevronRight,
    FaChevronLeft
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

export default function IntegrationsDataTable({ integrations, loading, refetch }) {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        global: '',
        name: '',
        order: '',
        status: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [togglingIntegrationId, setTogglingIntegrationId] = useState(null);
    const [deletingIntegrationId, setDeletingIntegrationId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [integrationToDelete, setIntegrationToDelete] = useState(null);
    const [updatingIntegration, setUpdatingIntegration] = useState(false);

    // Form state for add/edit
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        display_order: '',
        is_active: true
    });
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');

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
    const handleToggleStatus = async (integrationId) => {
        setTogglingIntegrationId(integrationId);
        try {
            await axios.patch(
                `https://api.nexus.com/api/admin/integrations/${integrationId}/toggle-status`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Integration status updated successfully', { duration: 2000 });
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
            setTogglingIntegrationId(null);
        }
    };

    const handleDeleteClick = (integrationId) => {
        setIntegrationToDelete(integrationId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!integrationToDelete) return;

        setDeletingIntegrationId(integrationToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://api.nexus.com/api/admin/integrations/${integrationToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Integration deleted successfully', { duration: 2000 });
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
            setDeletingIntegrationId(null);
            setIntegrationToDelete(null);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoFile(file);
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveFile = () => {
        setLogoFile(null);
        setLogoPreview('');
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAddIntegration = async (e) => {
        e.preventDefault();
        setUpdatingIntegration(true);
        try {
            const formDataToSend = new FormData();

            // Append text fields
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('display_order', formData.display_order);
            formDataToSend.append('is_active', formData.is_active ? 1 : 0);

            // Append file if it exists
            if (logoFile) formDataToSend.append('logo', logoFile);

            await axios.post(
                'https://api.nexus.com/api/admin/integrations',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingIntegration(false);
            toast.success('Integration added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
        } catch (error) {
            setUpdatingIntegration(false);
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

    const handleEditIntegration = async (e) => {
        e.preventDefault();
        setUpdatingIntegration(true);
        try {
            const formDataToSend = new FormData();

            // Append text fields
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('display_order', formData.display_order);
            formDataToSend.append('is_active', formData.is_active ? 1 : 0);

            // Append file if it exists
            if (logoFile) formDataToSend.append('logo', logoFile);

            await axios.post(
                `https://api.nexus.com/api/admin/integrations/${selectedIntegration.id}`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingIntegration(false);
            toast.success('Integration updated successfully', { duration: 2000 });
            setShowEditModal(false);
            resetForm();
            refetch();
        } catch (error) {
            setUpdatingIntegration(false);
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

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            display_order: '',
            is_active: true
        });
        setLogoFile(null);
        setLogoPreview('');
    };


    const prepareEditForm = (integration) => {
        setSelectedIntegration(integration);
        setFormData({
            name: integration.name,
            description: integration.description,
            display_order: integration.display_order,
            is_active: integration.is_active
        });
        // Reset file state
        setLogoFile(null);
        // Set preview from existing image
        setLogoPreview(integration.logo_url || '');
        setShowEditModal(true);
    };

    // Filter integrations based on all filter criteria
    const filteredIntegrations = integrations?.filter(integration => {
        return (
            (filters.global === '' ||
                integration.name.toLowerCase().includes(filters.global.toLowerCase()) ||
                integration.display_order.toString().includes(filters.global)) &&
            (filters.name === '' ||
                integration.name.toLowerCase().includes(filters.name.toLowerCase())) &&
            (filters.order === '' || integration.display_order.toString().includes(filters.order)) &&
            (filters.status === '' || (integration.is_active ? 'active' : 'inactive').includes(filters.status.toLowerCase()))
        );
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredIntegrations.length / rowsPerPage);
    const paginatedIntegrations = filteredIntegrations.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const statusBadge = (isActive) => {
        const statusClass = isActive
            ? 'bg-[#009379] text-white'
            : 'bg-[#930002] text-white';
        return (
            <span className={`flex justify-center w-fit items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClass} min-w-16 text-center`}>
                {isActive ? 'Active' : 'Inactive'}
            </span>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredIntegrations.length)} of {filteredIntegrations.length} entries
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
                    placeholder="Search integrations..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.permissions?.includes('create_integration') && <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Integration</span>
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
                                    placeholder="Order"
                                    value={filters.order}
                                    onChange={(e) => handleFilterChange('order', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    placeholder="Status"
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
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
                                <td colSpan="4" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading integrations...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedIntegrations.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-3 py-4 text-center">
                                    No integrations found
                                </td>
                            </tr>
                        ) : (
                            paginatedIntegrations.map((integration) => (
                                <tr key={integration.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {integration.logo_url && (
                                                <img
                                                    src={integration.logo_url}
                                                    alt="Integration logo"
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            )}
                                            <div>
                                                <div className="font-medium">{integration.name}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {integration.display_order}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(integration.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.permissions?.includes('edit_integration') && <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => prepareEditForm(integration)}
                                            >
                                                <FaEdit size={18} />
                                            </button>}

                                            {currentUser?.data?.data?.permissions?.includes('toggle_integration') && <button
                                                className={`${integration.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                onClick={() => handleToggleStatus(integration.id, integration.is_active)}
                                                disabled={togglingIntegrationId === integration.id}
                                            >
                                                {togglingIntegrationId === integration.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    integration.is_active ? <FaTimes /> : <FaCheck />
                                                )}
                                            </button>}

                                            {currentUser?.data?.data?.permissions?.includes('delete_integration') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(integration.id)}
                                                disabled={deletingIntegrationId === integration.id}
                                            >
                                                {deletingIntegrationId === integration.id ? (
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

            {/* Add Integration Modal */}
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
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Integration</h2>
                            <form onSubmit={handleAddIntegration}>
                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    <div>
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
                                </div>

                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                        <input
                                            type="number"
                                            name="display_order"
                                            value={formData.display_order}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                        <div className="flex items-center gap-2">
                                            {logoPreview ? (
                                                <div className="relative">
                                                    <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-md object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveFile}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                    >
                                                        <FaTimes size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <FaImage size={20} className="text-gray-400" />
                                                        <span className="text-xs text-gray-500">Upload logo</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 block text-sm text-gray-700">
                                        Active Integration
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
                                        disabled={updatingIntegration}
                                    >
                                        {updatingIntegration ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Integration</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Integration Modal */}
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
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Edit Integration</h2>
                            <form onSubmit={handleEditIntegration}>
                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    <div>
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
                                </div>

                                <div className="grid grid-cols-1 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                                        <input
                                            type="number"
                                            name="display_order"
                                            value={formData.display_order}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            min="0"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                        <div className="flex items-center gap-2">
                                            {logoPreview && (
                                                <div className="relative">
                                                    <img src={logoPreview} alt="Logo preview" className="w-16 h-16 rounded-md object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveFile}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                                                    >
                                                        <FaTimes size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50">
                                                <div className="flex flex-col items-center justify-center">
                                                    <FaImage size={20} className="text-gray-400" />
                                                    <span className="text-xs text-gray-500">
                                                        {logoPreview ? 'Change logo' : 'Upload logo'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="ml-2 block text-sm text-gray-700">
                                        Active Integration
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditModal(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                        disabled={updatingIntegration}
                                    >
                                        {updatingIntegration ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaEdit size={18} />
                                                <span>Update Integration</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Integration</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this integration? This action cannot be undone.
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