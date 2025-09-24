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
    FaEye,
    FaEyeSlash
} from 'react-icons/fa';
import TiptapWithImg from '../TextEditor/TiptapWithImg';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export default function HelpcenterArticlesDataTable({
    helpcenterArticlesData,
    helpcenterSubcategoriesData,
    helpcenterCategoriesData,
    loading,
    refetch
}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({
        global: '',
        title: '',
        subcategory: '',
        category: '',
        status: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [togglingArticleId, setTogglingArticleId] = useState(null);
    const [deletingArticleId, setDeletingArticleId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState(null);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [filteredSubcategories, setFilteredSubcategories] = useState([]);
    const [headings, setHeadings] = useState([]);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        subcategory_id: '',
        title: '',
        slug: '',
        content: '',
        order: '',
        is_active: true,
        headings: []
    });

    const { data: currentUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/auth/me',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                })
        }
    });

    // Handler for headings update from Tiptap
    const handleHeadingsUpdate = (extractedHeadings) => {
        const safeHeadings = Array.isArray(extractedHeadings) ? extractedHeadings : [];
        setHeadings(safeHeadings);
        setFormData(prev => ({ ...prev, headings: safeHeadings }));
    };

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (newArticle) => {
            return axios.post(
                'https://api.nexus.com/api/admin/help-center/topics',
                {
                    ...newArticle,
                    headings: JSON.stringify(newArticle.headings)
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['helpcenterarticles']);
            toast.success('Article created successfully');
            setShowAddModal(false);
            resetForm();
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to create article');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (updatedArticle) => {
            return axios.put(
                `https://api.nexus.com/api/admin/help-center/topics/${updatedArticle.id}`,
                {
                    ...updatedArticle,
                    headings: JSON.stringify(updatedArticle.headings)
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['helpcenterarticles']);
            toast.success('Article updated successfully');
            setShowEditModal(false);
            resetForm();
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update article');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id) => {
            return axios.delete(
                `https://api.nexus.com/api/admin/help-center/topics/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['helpcenterarticles']);
            toast.success('Article deleted successfully');
            setShowDeleteConfirm(false);
            refetch();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete article');
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to perform this action')
            }
        }
    });

    // Handle category change to filter subcategories
    const handleCategoryChange = (categoryId) => {
        const subs = helpcenterSubcategoriesData?.filter(
            sub => sub.category_id == categoryId
        ) || [];
        setFilteredSubcategories(subs);
        setFormData(prev => ({
            ...prev,
            category_id: categoryId,
            subcategory_id: ''
        }));
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleToggleStatus = async (articleId, currentStatus) => {
        setTogglingArticleId(articleId);
        try {
            await axios.patch(
                `https://api.nexus.com/api/admin/help-center/topics/${articleId}/toggle-status`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Article ${currentStatus ? 'deactivated' : 'activated'} successfully`, { duration: 2000 });
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
            setTogglingArticleId(null);
        }
    };

    const handleDeleteClick = (articleId) => {
        setArticleToDelete(articleId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!articleToDelete) return;
        deleteMutation.mutate(articleToDelete);
    };

    // Function to generate slug from title
    const generateSlug = (title) => {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Generate slug from title if it's not manually edited
        if (name === 'title' && !isSlugManuallyEdited) {
            const slug = generateSlug(value);
            setFormData(prev => ({
                ...prev,
                slug: slug
            }));
        }
    };

    // Handle slug input change
    const handleSlugChange = (e) => {
        const { value } = e.target;
        setFormData(prev => ({
            ...prev,
            slug: value
        }));
        setIsSlugManuallyEdited(true);
    };

    // Reset slug to auto-generated when clicking the reset button
    const handleResetSlug = () => {
        const slug = generateSlug(formData.title);
        setFormData(prev => ({
            ...prev,
            slug: slug
        }));
        setIsSlugManuallyEdited(false);
    };

    const resetForm = () => {
        setFormData({
            subcategory_id: '',
            title: '',
            slug: '',
            content: '',
            order: '',
            is_active: true,
            headings: []
        });
        setHeadings([]);
        setFilteredSubcategories([]);
        setIsSlugManuallyEdited(false);
    };

    const prepareEditForm = (article) => {
        setSelectedArticle(article);
        const categoryId = helpcenterSubcategoriesData?.find(
            sub => sub.id === article.subcategory_id
        )?.category_id;

        const subs = helpcenterSubcategoriesData?.filter(
            sub => sub.category_id == categoryId
        ) || [];

        setFilteredSubcategories(subs);

        let articleHeadings = [];
        if (article.headings && typeof article.headings === 'string' && article.headings.trim() !== '') {
            try {
                articleHeadings = JSON.parse(article.headings);
                if (!Array.isArray(articleHeadings)) {
                    articleHeadings = [];
                }
            } catch (e) {
                console.error('Error parsing headings:', e);
                articleHeadings = [];
            }
        }

        setFormData({
            subcategory_id: article.subcategory_id,
            title: article.title,
            slug: article.slug,
            content: article.content,
            order: article.order,
            is_active: article.is_active,
            headings: articleHeadings
        });
        setHeadings(articleHeadings);
        setShowEditModal(true);
        setIsSlugManuallyEdited(true); // Assume slug was manually edited when editing
    };

    const handleAddArticle = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const handleUpdateArticle = (e) => {
        e.preventDefault();
        updateMutation.mutate({
            id: selectedArticle.id,
            ...formData
        });
    };

    const getCategoryName = (subcategoryId) => {
        const subcategory = helpcenterSubcategoriesData?.find(sub => sub.id === subcategoryId);
        if (!subcategory) return 'Unknown';

        const category = helpcenterCategoriesData?.find(cat => cat.id === subcategory.category_id);
        return category ? category.name : 'Unknown';
    };

    const getSubcategoryName = (subcategoryId) => {
        const subcategory = helpcenterSubcategoriesData?.find(sub => sub.id === subcategoryId);
        return subcategory ? subcategory.name : 'Unknown';
    };

    const filteredArticles = helpcenterArticlesData?.filter(article => {
        const subcategoryName = getSubcategoryName(article.subcategory_id).toLowerCase();
        const categoryName = getCategoryName(article.subcategory_id).toLowerCase();

        return (
            (filters.global === '' ||
                article.title.toLowerCase().includes(filters.global.toLowerCase()) ||
                subcategoryName.includes(filters.global.toLowerCase()) ||
                categoryName.includes(filters.global.toLowerCase())) &&
            (filters.title === '' ||
                article.title.toLowerCase().includes(filters.title.toLowerCase())) &&
            (filters.subcategory === '' ||
                subcategoryName.includes(filters.subcategory.toLowerCase())) &&
            (filters.category === '' ||
                categoryName.includes(filters.category.toLowerCase())) &&
            (filters.status === '' ||
                (filters.status.toLowerCase() === 'active' && article.is_active) ||
                (filters.status.toLowerCase() === 'inactive' && !article.is_active))
        );
    }) || [];

    const totalPages = Math.ceil(filteredArticles.length / rowsPerPage);
    const paginatedArticles = filteredArticles.slice(
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
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredArticles.length)} of {filteredArticles.length} entries
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
                    placeholder="Search articles..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.permissions?.includes('create_help_topic') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                    >
                        <FaPlus size={18} />
                        <span>Add Article</span>
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={filters.title}
                                    onChange={(e) => handleFilterChange('title', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    placeholder="Category"
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    placeholder="Subcategory"
                                    value={filters.subcategory}
                                    onChange={(e) => handleFilterChange('subcategory', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order
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
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading articles...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedArticles.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    No articles found
                                </td>
                            </tr>
                        ) : (
                            paginatedArticles.map((article) => (
                                <tr key={article.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="font-medium">{article.title}</div>
                                        <div className="text-xs text-gray-500">{article.slug}</div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {getCategoryName(article.subcategory_id)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {getSubcategoryName(article.subcategory_id)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {article.order}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(article.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.permissions?.includes('edit_help_topic') && (
                                                <button
                                                    className="text-blue-500 hover:text-blue-700 p-1"
                                                    onClick={() => prepareEditForm(article)}
                                                    disabled={updateMutation.isPending}
                                                >
                                                    {updateMutation.isPending && selectedArticle?.id === article.id ? (
                                                        <FaSpinner className="animate-spin" size={18} />
                                                    ) : (
                                                        <FaEdit size={18} />
                                                    )}
                                                </button>
                                            )}
                                            {currentUser?.data?.data?.permissions?.includes('toggle_help_center_topic_status') && (
                                                <button
                                                    className={`${article.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                    onClick={() => handleToggleStatus(article.id, article.is_active)}
                                                    disabled={togglingArticleId === article.id}
                                                >
                                                    {togglingArticleId === article.id ? (
                                                        <FaSpinner className="animate-spin" size={18} />
                                                    ) : (
                                                        article.is_active ? <FaEyeSlash /> : <FaEye />
                                                    )}
                                                </button>
                                            )}
                                            {currentUser?.data?.data?.permissions?.includes('delete_help_topic') && (
                                                <button
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    onClick={() => handleDeleteClick(article.id)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    {deleteMutation.isPending && articleToDelete === article.id ? (
                                                        <FaSpinner className="animate-spin" size={18} />
                                                    ) : (
                                                        <FaTrashAlt size={18} />
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

            {/* Pagination */}
            {!loading && renderPagination()}

            {/* Add Article Modal */}
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
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Article</h2>
                            <form onSubmit={handleAddArticle}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                                        <select
                                            onChange={(e) => handleCategoryChange(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        >
                                            <option value="">Select a category</option>
                                            {helpcenterCategoriesData?.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory*</label>
                                        <select
                                            name="subcategory_id"
                                            value={formData.subcategory_id}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                            disabled={!formData.category_id}
                                        >
                                            <option value="">Select a subcategory</option>
                                            {filteredSubcategories?.map(subcategory => (
                                                <option key={subcategory.id} value={subcategory.id}>
                                                    {subcategory.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug*</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="slug"
                                            value={formData.slug}
                                            onChange={handleSlugChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                        {isSlugManuallyEdited && (
                                            <button
                                                type="button"
                                                onClick={handleResetSlug}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                title="Reset to auto-generated slug"
                                            >
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {isSlugManuallyEdited ?
                                            "Slug is manually edited. Click the X to reset to auto-generated." :
                                            "Slug is auto-generated from title. You can edit it manually."}
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order*</label>
                                    <input
                                        type="number"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content*</label>
                                    <TiptapWithImg
                                        uploadImgUrl='https://api.nexus.com/api/admin/help-center/topics/upload-image'
                                        content={formData.content}
                                        onUpdate={(content) => setFormData(prev => ({ ...prev, content }))}
                                        onHeadingsUpdate={handleHeadingsUpdate}
                                    />
                                </div>

                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                        Active
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
                                        disabled={createMutation.isPending}
                                    >
                                        {createMutation.isPending ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Article</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Article Modal */}
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
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Edit Article</h2>
                            <form onSubmit={handleUpdateArticle}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                                        <select
                                            onChange={(e) => handleCategoryChange(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                            value={helpcenterSubcategoriesData?.find(
                                                sub => sub.id === selectedArticle?.subcategory_id
                                            )?.category_id || ''}
                                        >
                                            <option value="">Select a category</option>
                                            {helpcenterCategoriesData?.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory*</label>
                                        <select
                                            name="subcategory_id"
                                            value={formData.subcategory_id}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        >
                                            <option value="">Select a subcategory</option>
                                            {filteredSubcategories?.map(subcategory => (
                                                <option key={subcategory.id} value={subcategory.id}>
                                                    {subcategory.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug*</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            name="slug"
                                            value={formData.slug}
                                            onChange={handleSlugChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                        {isSlugManuallyEdited && (
                                            <button
                                                type="button"
                                                onClick={handleResetSlug}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                title="Reset to auto-generated slug"
                                            >
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {isSlugManuallyEdited ?
                                            "Slug is manually edited. Click the X to reset to auto-generated." :
                                            "Slug is auto-generated from title. You can edit it manually."}
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order*</label>
                                    <input
                                        type="number"
                                        name="order"
                                        value={formData.order}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content*</label>
                                    <TiptapWithImg
                                        uploadImgUrl='https://api.nexus.com/api/admin/help-center/topics/upload-image'
                                        content={formData.content}
                                        onUpdate={(content) => setFormData(prev => ({ ...prev, content }))}
                                        onHeadingsUpdate={handleHeadingsUpdate}
                                    />
                                </div>

                                <div className="flex items-center mb-4">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                        Active
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
                                        disabled={updateMutation.isPending}
                                    >
                                        {updateMutation.isPending ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaEdit size={18} />
                                                <span>Update Article</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Article</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete the article "{articleToDelete && helpcenterArticlesData.find(a => a.id === articleToDelete)?.title}"?
                                            This action cannot be undone.
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
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <>
                                            <FaSpinner className="animate-spin" size={18} />
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaTrashAlt size={18} />
                                            <span>Delete</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </div>
    );
}