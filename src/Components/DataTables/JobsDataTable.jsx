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
    FaMapMarkerAlt,
    FaBriefcase,
    FaEnvelope,
    FaSave,
    FaFolderOpen
} from 'react-icons/fa';
import TiptapWithImg from '../TextEditor/TiptapWithImg';
import DateRangePicker from '../ReusableComponents/DateRangePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage';
import { XCircle } from 'lucide-react';

export default function JobsDataTable({ jobs, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedJobs, setSelectedJobs] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [filters, setFilters] = useState({
        global: '',
        title: '',
        location: '',
        type: '',
        status: '',
        author: '',
        created_from: '',
        created_to: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingJobId, setDeletingJobId] = useState(null);
    const [togglingJobId, setTogglingJobId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [jobToDelete, setJobToDelete] = useState(null);
    const [updatingJob, setUpdatingJob] = useState(false);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [isEditSlugManuallyEdited, setIsEditSlugManuallyEdited] = useState(false);
    const [editingJobId, setEditingJobId] = useState(null);

    const DRAFTS_STORAGE_KEY = 'jobDrafts';
    const [drafts, setDrafts] = useState([]);
    const [activeDraftId, setActiveDraftId] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        location: '',
        type: 'full-time',
        key_responsibilities: '',
        preferred_qualifications: '',
        is_active: true
    });

    const [editFormData, setEditFormData] = useState({
        id: null,
        title: '',
        slug: '',
        location: '',
        type: 'full-time',
        key_responsibilities: '',
        preferred_qualifications: '',
        is_active: true
    });

    // Job types
    const jobTypes = [
        { value: 'full-time', label: 'Full Time' },
        { value: 'part-time', label: 'Part Time' },
        { value: 'contract', label: 'Contract' },
        { value: 'freelance', label: 'Freelance' },
        { value: 'internship', label: 'Internship' }
    ];

    // Fetch current user for permissions
    const { data: currentUser, isLoading: isCurrentuserLoading } = useQuery({
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

    // Fetch individual job by ID
    const { data: jobData, isLoading: isJobLoading, refetch: refetchJob } = useQuery({
        queryKey: ['job', editingJobId],
        queryFn: () => {
            if (!editingJobId) return Promise.resolve(null);
            return axios.get(
                `https://nexus-consults.com/api/admin/jobs/${editingJobId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ).then(res => res.data.data);
        },
        enabled: !!editingJobId,
        staleTime: 5 * 60 * 1000,
    });

    // -------- Drafts utilities --------
    const DRAFTS_FALLBACK_KEY = 'jobDrafts_beforeunload_fallback';
    const loadDrafts = async () => {
        try {
            const list = await localforage.getItem(DRAFTS_STORAGE_KEY);
            const parsed = Array.isArray(list) ? list : [];
            setDrafts(parsed);

            const fbRaw = localStorage.getItem(DRAFTS_FALLBACK_KEY);
            if (fbRaw) {
                try {
                    const fb = JSON.parse(fbRaw);
                    if (fb && typeof fb === 'object') {
                        upsertDraft(fb);
                    }
                } catch (_) { }
                localStorage.removeItem(DRAFTS_FALLBACK_KEY);
            }
        } catch (_) {
        }
    };

    const persistDrafts = async (list) => {
        try {
            await localforage.setItem(DRAFTS_STORAGE_KEY, list);
        } catch (e) {
            console.error('Persist drafts failed', e);
            toast.error('Could not save drafts locally');
        }
    };

    const upsertDraft = async (draft) => {
        setDrafts(prev => {
            const byId = prev.findIndex(d => d.id === draft.id);
            let next = [...prev];
            const now = new Date().toISOString();
            if (byId >= 0) {
                next[byId] = { ...prev[byId], ...draft, updatedAt: now };
            } else {
                const bySlugIdx = draft.slug ? prev.findIndex(d => d.slug === draft.slug && d.slug) : -1;
                if (bySlugIdx >= 0) {
                    next[bySlugIdx] = { ...prev[bySlugIdx], ...draft, id: prev[bySlugIdx].id, updatedAt: now };
                } else {
                    next.push({ ...draft, updatedAt: now });
                }
            }

            if (next.length > 20) {
                next = next
                    .slice()
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, 20);
            }

            persistDrafts(next);
            return next;
        });
    };

    const deleteDraft = async (id) => {
        setDrafts(prev => {
            const next = prev.filter(d => d.id !== id);
            persistDrafts(next);
            return next;
        });
        if (activeDraftId === id) setActiveDraftId(null);
    };

    const clearMatchingDraftBySlug = async (slug) => {
        if (!slug) return;
        setDrafts(prev => {
            const next = prev.filter(d => d.slug !== slug);
            persistDrafts(next);
            return next;
        });
    };

    useEffect(() => {
        loadDrafts();
    }, []);

    const makeDraftFromForm = () => {
        const hasContent = (formData.title && formData.title.trim() !== '') ||
            (formData.key_responsibilities && formData.key_responsibilities.trim() !== '') ||
            (formData.preferred_qualifications && formData.preferred_qualifications.trim() !== '');
        if (!hasContent) return null;

        let id = activeDraftId;
        if (!id && formData.slug) {
            const existing = drafts.find(d => d.slug === formData.slug);
            if (existing) id = existing.id;
        }
        return {
            id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: formData.title,
            slug: formData.slug,
            location: formData.location,
            type: formData.type,
            key_responsibilities: formData.key_responsibilities,
            preferred_qualifications: formData.preferred_qualifications,
            is_active: formData.is_active
        };
    };

    const saveCurrentAsDraft = () => {
        const draft = makeDraftFromForm();
        if (!draft) return;
        setActiveDraftId(draft.id);
        upsertDraft(draft);
        toast.success('Draft saved locally');
    };

    const resumeDraft = (draft) => {
        setFormData({
            title: draft.title || '',
            slug: draft.slug || '',
            location: draft.location || '',
            type: draft.type || 'full-time',
            key_responsibilities: draft.key_responsibilities || '',
            preferred_qualifications: draft.preferred_qualifications || '',
            is_active: draft.is_active ?? true
        });
        setIsSlugManuallyEdited(true);
        setShowAddModal(true);
        toast('Draft loaded');
    };

    // Auto-save while Add modal is open
    const addAutoSaveInterval = useRef(null);
    const lastAutoSaveRef = useRef('');

    useEffect(() => {
        if (showAddModal) {
            addAutoSaveInterval.current = setInterval(() => {
                const draft = makeDraftFromForm();
                if (draft) {
                    const currentContent = JSON.stringify({
                        title: draft.title,
                        location: draft.location,
                        type: draft.type,
                        key_responsibilities: draft.key_responsibilities,
                        preferred_qualifications: draft.preferred_qualifications
                    });

                    if (currentContent !== lastAutoSaveRef.current) {
                        setActiveDraftId(prev => prev || draft.id);
                        upsertDraft(draft);
                        lastAutoSaveRef.current = currentContent;
                    }
                }
            }, 5000);

            const onBeforeUnload = () => {
                const draft = makeDraftFromForm();
                if (draft) {
                    upsertDraft(draft);
                    try {
                        localStorage.setItem(DRAFTS_FALLBACK_KEY, JSON.stringify(draft));
                    } catch (_) { }
                }
            };
            window.addEventListener('beforeunload', onBeforeUnload);

            return () => {
                if (addAutoSaveInterval.current) clearInterval(addAutoSaveInterval.current);
                window.removeEventListener('beforeunload', onBeforeUnload);
            };
        } else {
            if (addAutoSaveInterval.current) clearInterval(addAutoSaveInterval.current);
            lastAutoSaveRef.current = '';
        }
    }, [showAddModal]);

    // Function to generate slug from title
    const generateSlug = (title) => {
        return title.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleToggleStatus = async (jobId, currentStatus) => {
        setTogglingJobId(jobId);
        try {
            await axios.patch(
                `https://nexus-consults.com/api/admin/jobs/${jobId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Job ${currentStatus ? 'deactivated' : 'activated'} successfully`, { duration: 2000 });
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
            setTogglingJobId(null);
        }
    };

    const handleDeleteClick = (jobId) => {
        setJobToDelete(jobId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!jobToDelete) return;

        setDeletingJobId(jobToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/admin/jobs/${jobToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Job deleted successfully', { duration: 2000 });
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
            setDeletingJobId(null);
            setJobToDelete(null);
        }
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

    const handleEditFormChange = (e) => {
        const { name, value, type, checked } = e.target;

        setEditFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Generate slug from title if it's not manually edited
        if (name === 'title' && !isEditSlugManuallyEdited) {
            const slug = generateSlug(value);
            setEditFormData(prev => ({
                ...prev,
                slug: slug
            }));
        }
    };

    // Handle edit slug input change
    const handleEditSlugChange = (e) => {
        const { value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            slug: value
        }));
        setIsEditSlugManuallyEdited(true);
    };

    // Reset edit slug to auto-generated when clicking the reset button
    const handleEditResetSlug = () => {
        const slug = generateSlug(editFormData.title);
        setEditFormData(prev => ({
            ...prev,
            slug: slug
        }));
        setIsEditSlugManuallyEdited(false);
    };

    // Handle content change for text editor fields
    const handleKeyResponsibilitiesChange = (content) => {
        setFormData(prev => ({ ...prev, key_responsibilities: content }));
    };

    const handlePreferredQualificationsChange = (content) => {
        setFormData(prev => ({ ...prev, preferred_qualifications: content }));
    };

    const handleEditKeyResponsibilitiesChange = (content) => {
        setEditFormData(prev => ({ ...prev, key_responsibilities: content }));
    };

    const handleEditPreferredQualificationsChange = (content) => {
        setEditFormData(prev => ({ ...prev, preferred_qualifications: content }));
    };

    const resetForm = () => {
        setFormData({
            title: '',
            slug: '',
            location: '',
            type: 'full-time',
            key_responsibilities: '',
            preferred_qualifications: '',
            is_active: true
        });
        setIsSlugManuallyEdited(false);
    };

    const prepareEditForm = (job) => {
        setEditingJobId(job.id);
    };

    // Effect to populate edit form when job data is fetched
    useEffect(() => {
        if (jobData && editingJobId) {
            setEditFormData({
                id: jobData.id,
                title: jobData.title,
                slug: jobData.slug,
                location: jobData.location,
                type: jobData.type,
                key_responsibilities: jobData.key_responsibilities,
                preferred_qualifications: jobData.preferred_qualifications,
                is_active: jobData.is_active
            });
            setIsEditSlugManuallyEdited(true);
            setShowEditModal(true);
        }
    }, [jobData, editingJobId]);

    const handleAddJob = async (e) => {
        e.preventDefault();

        setUpdatingJob(true);
        try {
            await axios.post(
                'https://nexus-consults.com/api/admin/jobs',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            setUpdatingJob(false);
            toast.success('Job added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
            clearMatchingDraftBySlug(formData.slug);
            setActiveDraftId(null);
        } catch (error) {
            setUpdatingJob(false);
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

    const handleUpdateJob = async (e) => {
        e.preventDefault();

        setUpdatingJob(true);
        try {
            await axios.post(
                `https://nexus-consults.com/api/admin/jobs/${editFormData.id}`,
                editFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            setUpdatingJob(false);
            toast.success('Job updated successfully', { duration: 2000 });
            setShowEditModal(false);
            setEditingJobId(null);
            refetch();
            queryClient.invalidateQueries(['job', editFormData.id]);
        } catch (error) {
            setUpdatingJob(false);
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

    // Filter jobs based on all filter criteria
    const filteredJobs = jobs?.filter(job => {
        // Text filters
        const matchesGlobal =
            filters.global === '' ||
            job.title.toLowerCase().includes(filters.global.toLowerCase()) ||
            job.location.toLowerCase().includes(filters.global.toLowerCase()) ||
            (job.author?.name ? job.author.name.toLowerCase().includes(filters.global.toLowerCase()) : false);

        const matchesTitle = filters.title === '' || job.title.toLowerCase().includes(filters.title.toLowerCase());
        const matchesLocation = filters.location === '' || job.location.toLowerCase().includes(filters.location.toLowerCase());
        const matchesType = filters.type === '' || job.type === filters.type;
        const matchesStatus = filters.status === '' || (filters.status === 'active' ? job.is_active : !job.is_active);
        const matchesAuthor =
            filters.author === '' || (job.author?.name ? job.author.name.toLowerCase().includes(filters.author.toLowerCase()) : false);

        // Date range filter on created_at
        let matchesDate = true;
        if (job.created_at) {
            const createdDate = new Date(job.created_at);
            if (filters.created_from) {
                const start = new Date(`${filters.created_from}T00:00:00`);
                if (createdDate < start) matchesDate = false;
            }
            if (matchesDate && filters.created_to) {
                const end = new Date(`${filters.created_to}T23:59:59.999`);
                if (createdDate > end) matchesDate = false;
            }
        }

        return matchesGlobal && matchesTitle && matchesLocation && matchesType && matchesStatus && matchesAuthor && matchesDate;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredJobs.length / rowsPerPage);
    const paginatedJobs = filteredJobs.slice(
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

    const typeBadge = (type) => {
        const typeConfig = {
            'full-time': { color: 'bg-blue-100 text-blue-800', label: 'Full Time' },
            'part-time': { color: 'bg-green-100 text-green-800', label: 'Part Time' },
            'contract': { color: 'bg-purple-100 text-purple-800', label: 'Contract' },
            'freelance': { color: 'bg-orange-100 text-orange-800', label: 'Freelance' },
            'internship': { color: 'bg-pink-100 text-pink-800', label: 'Internship' }
        };

        const config = typeConfig[type] || { color: 'bg-gray-100 text-gray-800', label: type };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <FaBriefcase className="mr-1" size={10} />
                {config.label}
            </span>
        );
    };

    const applicationsCountBadge = (count) => {
        const applicationsCount = count || 0;
        const colorClass = applicationsCount > 0
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-gray-100 text-gray-600 border-gray-200';

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                <FaEnvelope size={10} />
                {applicationsCount}
            </span>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredJobs.length)} of {filteredJobs.length} entries
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

    // Handle individual job selection
    const handleSelectJob = (jobId, isSelected) => {
        if (isSelected) {
            setSelectedJobs(prev => [...prev, jobId]);
        } else {
            setSelectedJobs(prev => prev.filter(id => id !== jobId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedJobs(filteredJobs.map(job => job.id));
            setSelectAll(true);
        } else {
            setSelectedJobs([]);
            setSelectAll(false);
        }
    };

    // State for delete confirmation modal
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Bulk delete jobs
    const handleBulkDelete = async () => {
        if (!selectedJobs.length) return;
        setShowBulkDeleteConfirm(true);
    };

    // Confirm bulk delete
    const confirmBulkDelete = async () => {
        setShowBulkDeleteConfirm(false);

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/admin/jobs/bulk/delete',
                { ids: selectedJobs },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedJobs.length} job(s) deleted successfully`);
            setSelectedJobs([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting jobs:', error);
            toast.error(error.response?.data?.message || 'Failed to delete jobs');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Bulk update job status
    const handleBulkStatusUpdate = async (status) => {
        if (!selectedJobs.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/admin/jobs/bulk/update-status',
                {
                    ids: selectedJobs,
                    status: status
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Status updated for ${selectedJobs.length} job(s)`);
            setSelectedJobs([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error updating job status:', error);
            toast.error(error.response?.data?.message || 'Failed to update job status');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    return (
        <div className="shadow-2xl rounded-2xl overflow-hidden bg-white">
            {/* Global Search and Add Button */}
            <div className="p-4 border-b flex justify-between items-center gap-4">
                <input
                    type="text"
                    value={filters.global}
                    onChange={(e) => handleFilterChange('global', e.target.value)}
                    placeholder="Search jobs..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.admin?.permissions?.includes('create_jobs') && <button
                    onClick={() => { setShowAddModal(true); resetForm() }}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Job</span>
                </button>}
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
                                        checked={selectAll && filteredJobs.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="ml-2">Title</span>
                                </div>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    value={filters.author}
                                    onChange={(e) => handleFilterChange('author', e.target.value)}
                                    placeholder="Author"
                                    className="text-xs p-1 border rounded w-full"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <input
                                    type="text"
                                    value={filters.location}
                                    onChange={(e) => handleFilterChange('location', e.target.value)}
                                    placeholder="Location"
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
                                    {jobTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Applications
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
                                <td colSpan="8" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading jobs...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedJobs.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-3 py-4 text-center">
                                    No jobs found
                                </td>
                            </tr>
                        ) : (
                            paginatedJobs.map((job) => (
                                <tr key={job.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedJobs.includes(job.id)}
                                                onChange={(e) => handleSelectJob(job.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                {job.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {job.author?.name || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <FaMapMarkerAlt className="text-gray-400" size={12} />
                                            {job.location}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {typeBadge(job.type)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {applicationsCountBadge(job.applications_count)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(job.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_jobs') && <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => prepareEditForm(job)}
                                                disabled={isJobLoading}
                                            >
                                                {isJobLoading && editingJobId === job.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    <FaEdit size={18} />
                                                )}
                                            </button>}
                                            <button
                                                className={`${job.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                onClick={() => handleToggleStatus(job.id, job.is_active)}
                                                disabled={togglingJobId === job.id}
                                            >
                                                {togglingJobId === job.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    job.is_active ? <FaTimes /> : <FaCheck />
                                                )}
                                            </button>
                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_jobs') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(job.id)}
                                                disabled={deletingJobId === job.id}
                                                title="Delete"
                                            >
                                                {deletingJobId === job.id ? (
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

            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-lg p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <p className="text-gray-700 mb-6">
                            Are you sure you want to delete {selectedJobs.length} selected job(s)? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                disabled={isBulkActionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBulkDelete}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
                                disabled={isBulkActionLoading}
                            >
                                {isBulkActionLoading ? (
                                    <>
                                        <FaSpinner className="animate-spin mr-2" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Bulk Actions Toolbar */}
            {selectedJobs.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedJobs.length} job(s) selected
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleBulkStatusUpdate(true)}
                                disabled={isBulkActionLoading}
                                className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                            >
                                <FaCheck className="mr-1.5" />
                                Activate
                            </button>
                            <button
                                onClick={() => handleBulkStatusUpdate(false)}
                                disabled={isBulkActionLoading}
                                className="flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
                            >
                                <FaTimes className="mr-1.5" />
                                Deactivate
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkActionLoading}
                                className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                            >
                                <FaTrashAlt className="mr-1.5" />
                                Delete
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedJobs([]);
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

            {/* Drafts Table (client-side) */}
            <div className="p-4 border-t">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Drafts</h2>
                    <div className="text-xs text-gray-500">Drafts are stored locally in your browser</div>
                </div>
                {drafts.length === 0 ? (
                    <div className="text-sm text-gray-500">No drafts yet</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Title</th>
                                    <th className="px-4 py-2 text-left">Location</th>
                                    <th className="px-4 py-2 text-left">Type</th>
                                    <th className="px-4 py-2 text-left">Updated</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {drafts
                                    .slice()
                                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                                    .map(d => (
                                        <tr key={d.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">{d.title || <span className="italic text-gray-400">Untitled</span>}</td>
                                            <td className="px-4 py-2">{d.location || '-'}</td>
                                            <td className="px-4 py-2">
                                                {jobTypes.find(t => t.value === d.type)?.label || d.type}
                                            </td>
                                            <td className="px-4 py-2">{new Date(d.updatedAt).toLocaleString()}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                                        onClick={() => resumeDraft(d)}
                                                    >
                                                        <FaFolderOpen /> Resume
                                                    </button>
                                                    <button
                                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                                                        onClick={() => deleteDraft(d.id)}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Job Modal */}
            {showAddModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 "

                >
                    <button onClick={() => {
                        setShowAddModal(false); const draft = makeDraftFromForm();
                        if (draft) upsertDraft(draft);
                    }} className='fixed top-5 right-5 text-red-500 backdrop-blur-lg rounded-full z-50' >
                        <XCircle className='' size={40} />
                    </button>
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-4/5 h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Job</h2>
                            <form onSubmit={handleAddJob}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
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
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location*</label>
                                        <input
                                            type="text"
                                            name="location"
                                            value={formData.location}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Type*</label>
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        >
                                            {jobTypes.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={handleFormChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                            Active
                                        </label>
                                    </div>
                                </div>

                                {/* Key Responsibilities */}
                                <div className="p-4 border rounded-lg mb-4">
                                    <h3 className="text-lg font-medium mb-4">Key Responsibilities*</h3>
                                    <div className="mb-4">
                                        <TiptapWithImg
                                            content={formData.key_responsibilities}
                                            onUpdate={handleKeyResponsibilitiesChange}
                                        />
                                    </div>
                                </div>

                                {/* Preferred Qualifications */}
                                <div className="p-4 border rounded-lg mb-4">
                                    <h3 className="text-lg font-medium mb-4">Preferred Qualifications*</h3>
                                    <div className="mb-4">
                                        <TiptapWithImg
                                            content={formData.preferred_qualifications}
                                            onUpdate={handlePreferredQualificationsChange}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <div className="text-xs text-gray-500 mt-2 flex items-center">
                                        <FaSpinner className={`animate-spin mr-1 ${updatingJob ? 'opacity-100' : 'opacity-0'}`} size={12} />
                                        Auto-saves to drafts every 5s
                                    </div>
                                    <button
                                        type="button"
                                        onClick={saveCurrentAsDraft}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <FaSave size={16} /> Save as Draft
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const draft = makeDraftFromForm();
                                            if (draft) upsertDraft(draft);
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
                                        disabled={updatingJob}
                                    >
                                        {updatingJob ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Job</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Job Modal */}
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"

                >
                    <button onClick={() => {
                        setShowEditModal(false); setEditingJobId(null);
                    }} className='fixed top-5 right-5 text-red-500 backdrop-blur-lg rounded-full z-50' >
                        <XCircle className='' size={40} />
                    </button>
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-4/5 h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingJobId(null);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Jobs
                                </button>
                                <span className="mx-2 text-gray-400">{'>'}</span>
                                <span className="text-xl font-bold text-gray-900">
                                    {editFormData.title || 'Untitled Job'}
                                </span>
                                {isJobLoading && (
                                    <div className="ml-4 flex items-center text-sm text-gray-500">
                                        <FaSpinner className="animate-spin mr-2" size={14} />
                                        Loading job data...
                                    </div>
                                )}
                            </div>

                            {isJobLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <FaSpinner className="animate-spin mr-2" size={24} />
                                    <span>Loading job data...</span>
                                </div>
                            ) : (
                                <form onSubmit={handleUpdateJob}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                                            <input
                                                type="text"
                                                name="title"
                                                value={editFormData.title}
                                                onChange={handleEditFormChange}
                                                className="w-full px-3 py-2 border rounded-md"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Location*</label>
                                            <input
                                                type="text"
                                                name="location"
                                                value={editFormData.location}
                                                onChange={handleEditFormChange}
                                                className="w-full px-3 py-2 border rounded-md"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Slug*</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                name="slug"
                                                value={editFormData.slug}
                                                onChange={handleEditSlugChange}
                                                className="w-full px-3 py-2 border rounded-md"
                                                required
                                            />
                                            {isEditSlugManuallyEdited && (
                                                <button
                                                    type="button"
                                                    onClick={handleEditResetSlug}
                                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    title="Reset to auto-generated slug"
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {isEditSlugManuallyEdited ?
                                                "Slug is manually edited. Click the X to reset to auto-generated." :
                                                "Slug is auto-generated from title. You can edit it manually."}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Job Type*</label>
                                            <select
                                                name="type"
                                                value={editFormData.type}
                                                onChange={handleEditFormChange}
                                                className="w-full px-3 py-2 border rounded-md"
                                                required
                                            >
                                                {jobTypes.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="edit_is_active"
                                                name="is_active"
                                                checked={editFormData.is_active}
                                                onChange={handleEditFormChange}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="edit_is_active" className="ml-2 text-sm text-gray-700">
                                                Active
                                            </label>
                                        </div>
                                    </div>

                                    {/* Key Responsibilities */}
                                    <div className="p-4 border rounded-lg mb-4">
                                        <h3 className="text-lg font-medium mb-4">Key Responsibilities*</h3>
                                        <div className="mb-4">
                                            <TiptapWithImg
                                                content={editFormData.key_responsibilities}
                                                onUpdate={handleEditKeyResponsibilitiesChange}
                                            />
                                        </div>
                                    </div>

                                    {/* Preferred Qualifications */}
                                    <div className="p-4 border rounded-lg mb-4">
                                        <h3 className="text-lg font-medium mb-4">Preferred Qualifications*</h3>
                                        <div className="mb-4">
                                            <TiptapWithImg
                                                content={editFormData.preferred_qualifications}
                                                onUpdate={handleEditPreferredQualificationsChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEditModal(false);
                                                setEditingJobId(null);
                                            }}
                                            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                            disabled={updatingJob}
                                        >
                                            {updatingJob ? (
                                                <>
                                                    <FaSpinner className="animate-spin" size={18} />
                                                    <span>Updating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaCheck size={18} />
                                                    <span>Update Job</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Job</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this job? This action cannot be undone.
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