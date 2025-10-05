import React, { useState, useEffect } from 'react';
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
    FaChevronRight,
    FaChevronLeft,
    FaLock,
    FaLockOpen
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { XCircle } from 'lucide-react';

export default function AdminsDataTable({ admins, allPermissions, loading, refetch }) {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        global: '',
        name: '',
        email: '',
        status: '',
        role: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [togglingAdminId, setTogglingAdminId] = useState(null);
    const [deletingAdminId, setDeletingAdminId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [adminToDelete, setAdminToDelete] = useState(null);
    const [updatingAdmin, setUpdatingAdmin] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        permissions: []
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
            return axios.get('https://nexus-consults.com/api/public/api/admin/auth/profile',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    })

    const handleToggleStatus = async (adminId, currentStatus) => {
        setTogglingAdminId(adminId);
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            await axios.patch(
                `https://nexus-consults.com/api/public/api/admin/${adminId}/toggle-status`,
                { status: newStatus },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Admin ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, { duration: 2000 });
            refetch();
        } catch (error) {
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
        } finally {
            setTogglingAdminId(null);
        }
    };

    const handleDeleteClick = (adminId) => {
        setAdminToDelete(adminId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!adminToDelete) return;

        setDeletingAdminId(adminToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/public/api/admin/users/${adminToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Admin deleted successfully', { duration: 2000 });
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
            setDeletingAdminId(null);
            setAdminToDelete(null);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePermissionChange = (permission, isChecked) => {
        setFormData(prev => {
            if (isChecked) {
                return {
                    ...prev,
                    permissions: [...prev.permissions, permission]
                };
            } else {
                return {
                    ...prev,
                    permissions: prev.permissions.filter(p => p !== permission)
                };
            }
        });
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
            permissions: []
        });
    };

    const prepareEditForm = (admin) => {
        setSelectedAdmin(admin);
        setFormData({
            name: admin.name,
            email: admin.email,
            password: '',
            confirmPassword: '',
            permissions: [...admin.permissions]
        });
        setShowEditModal(true);
    };

    const preparePermissionsForm = (admin) => {
        setSelectedAdmin(admin);
        setFormData({
            ...formData,
            permissions: [...admin.permissions]
        });
        setShowPermissionsModal(true);
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match', { duration: 3000 });
            return;
        }

        setUpdatingAdmin(true);
        try {
            await axios.post(
                'https://nexus-consults.com/api/public/api/admin/users',
                {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    permissions: formData.permissions
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            setUpdatingAdmin(false);
            toast.success('Admin added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
        } catch (error) {
            setUpdatingAdmin(false);
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

    const handleUpdateAdmin = async (e) => {
        e.preventDefault();

        if (formData.password && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match', { duration: 3000 });
            return;
        }

        setUpdatingAdmin(true);
        try {
            const payload = {
                name: formData.name,
                email: formData.email
            };

            if (formData.password) {
                payload.password = formData.password;
            }

            await axios.put(
                `https://nexus-consults.com/api/public/api/admin/users/${selectedAdmin.id}`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            setUpdatingAdmin(false);
            toast.success('Admin updated successfully', { duration: 2000 });
            setShowEditModal(false);
            resetForm();
            refetch();
        } catch (error) {
            setUpdatingAdmin(false);
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

    const handleUpdatePermissions = async (e) => {
        e.preventDefault();

        setUpdatingAdmin(true);
        try {
            await axios.post(
                `https://nexus-consults.com/api/public/api/admin/permissions/assign/${selectedAdmin.id}`,
                {
                    permissions: formData.permissions
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            setUpdatingAdmin(false);
            toast.success('Permissions updated successfully', { duration: 2000 });
            setShowPermissionsModal(false);
            resetForm();
            refetch();
        } catch (error) {
            setUpdatingAdmin(false);
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

    // Filter admins based on all filter criteria
    const filteredAdmins = admins?.filter(admin => {
        return (
            (filters.global === '' ||
                admin.name.toLowerCase().includes(filters.global.toLowerCase()) ||
                admin.email.toLowerCase().includes(filters.global.toLowerCase())) &&
            (filters.name === '' ||
                admin.name.toLowerCase().includes(filters.name.toLowerCase())) &&
            (filters.email === '' ||
                admin.email.toLowerCase().includes(filters.email.toLowerCase())) &&
            (filters.status === '' || admin.status.includes(filters.status.toLowerCase())) &&
            (filters.role === '' || admin.role.includes(filters.role.toLowerCase()))
        );
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredAdmins.length / rowsPerPage);
    const paginatedAdmins = filteredAdmins.slice(
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
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredAdmins.length)} of {filteredAdmins.length} entries
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
                    placeholder="Search admins..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.admin?.permissions?.includes('create_admins') && <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Admin</span>
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
                                    placeholder="Email"
                                    value={filters.email}
                                    onChange={(e) => handleFilterChange('email', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
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
                                <td colSpan="5" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading admins...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedAdmins.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-3 py-4 text-center">
                                    No admins found
                                </td>
                            </tr>
                        ) : (
                            paginatedAdmins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="font-medium">{admin.name}</div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {admin.email}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap capitalize">
                                        {admin.role}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(admin.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {
                                                currentUser?.data?.data?.admin?.permissions?.includes('edit_admins') && <button
                                                    className="text-blue-500 hover:text-blue-700 p-1"
                                                    onClick={() => prepareEditForm(admin)}
                                                >
                                                    <FaEdit size={18} />
                                                </button>
                                            }

                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_admins') && <button
                                                className="text-purple-500 hover:text-purple-700 p-1"
                                                onClick={() => preparePermissionsForm(admin)}
                                            >
                                                <FaLock size={18} />
                                            </button>}

                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_admins') && <button
                                                className={`${admin.status === 'active' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                onClick={() => handleToggleStatus(admin.id, admin.status)}
                                                disabled={togglingAdminId === admin.id}
                                            >
                                                {togglingAdminId === admin.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    admin.status === 'active' ? <FaTimes /> : <FaCheck />
                                                )}
                                            </button>}

                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_admins') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(admin.id)}
                                                disabled={deletingAdminId === admin.id}
                                            >
                                                {deletingAdminId === admin.id ? (
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

            {/* Add Admin Modal */}
            {showAddModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <button onClick={() => {
                        setShowAddModal(false);
                    }} className='fixed top-5 right-5 text-red-500 backdrop-blur-lg rounded-full z-50' >
                        <XCircle className='' size={40} />
                    </button>
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Admin</h2>
                            <form onSubmit={handleAddAdmin}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                permissions: allPermissions.map(p => p.name)
                                            }));
                                        }}
                                        className="mb-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                permissions: []
                                            }));
                                        }}
                                        className="mb-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded ml-2"
                                    >
                                        Clear All
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                                        {allPermissions.map(permission => (
                                            <div key={permission.name} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`perm-${permission.name}`}
                                                    checked={formData.permissions.includes(permission.name)}
                                                    onChange={(e) => handlePermissionChange(permission.name, e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor={`perm-${permission.name}`} className="ml-2 text-sm text-gray-700">
                                                    <div className="font-medium">{permission.name.replaceAll('_', ' ')}</div>
                                                    <div className="text-xs text-gray-500">{permission.description}</div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
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
                                        disabled={updatingAdmin}
                                    >
                                        {updatingAdmin ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Admin</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <button onClick={() => {
                        setShowEditModal(false);
                    }} className='fixed top-5 right-5 text-red-500 backdrop-blur-lg rounded-full z-50' >
                        <XCircle className='' size={40} />
                    </button>
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Edit Admin</h2>
                            <form onSubmit={handleUpdateAdmin}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave blank to keep current)</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
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
                                        disabled={updatingAdmin}
                                    >
                                        {updatingAdmin ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaEdit size={18} />
                                                <span>Update Admin</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Permissions Modal */}
            {showPermissionsModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                >
                    <button onClick={() => {
                        setShowPermissionsModal(false);
                    }} className='fixed top-5 right-5 text-red-500 backdrop-blur-lg rounded-full z-50' >
                        <XCircle className='' size={40} />
                    </button>
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">
                                Manage Permissions for {selectedAdmin?.name}
                            </h2>
                            <form onSubmit={handleUpdatePermissions}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                permissions: allPermissions.map(p => p.name)
                                            }));
                                        }}
                                        className="mb-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                permissions: []
                                            }));
                                        }}
                                        className="mb-2 text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded ml-2"
                                    >
                                        Clear All
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                                        {allPermissions.map(permission => (
                                            <div key={permission.name} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`perm-edit-${permission.name}`}
                                                    checked={formData.permissions.includes(permission.name)}
                                                    onChange={(e) => handlePermissionChange(permission.name, e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor={`perm-edit-${permission.name}`} className="ml-2 text-sm text-gray-700">
                                                    <div className="font-medium">{permission.name.replaceAll('_', ' ')}</div>
                                                    <div className="text-xs text-gray-500">{permission.description}</div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowPermissionsModal(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                        disabled={updatingAdmin}
                                    >
                                        {updatingAdmin ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaLock size={18} />
                                                <span>Update Permissions</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Admin</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this admin? This action cannot be undone.
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