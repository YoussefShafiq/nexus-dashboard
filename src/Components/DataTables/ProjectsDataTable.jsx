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
    FaImage,
    FaEnvelope,
    FaQuestionCircle,
    FaTimesCircle,
    FaCheckSquare,
    FaMinusSquare,
    FaSquare,
    FaSave,
    FaFolderOpen
} from 'react-icons/fa';
import TiptapWithImg from '../TextEditor/TiptapWithImg';
import DateRangePicker from '../ReusableComponents/DateRangePicker';
import { Chips } from 'primereact/chips';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage';
import { XCircle } from 'lucide-react';

export default function ProjectsDataTable({ projects, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [filters, setFilters] = useState({
        global: '',
        title: '',
        status: '',
        author: '',
        created_from: '', // YYYY-MM-DD
        created_to: '' // YYYY-MM-DD
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingProjectId, setDeletingProjectId] = useState(null);
    const [togglingProjectId, setTogglingProjectId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [updatingProject, setUpdatingProject] = useState(false);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [isEditSlugManuallyEdited, setIsEditSlugManuallyEdited] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);

    const DRAFTS_STORAGE_KEY = 'projectDrafts';
    const [drafts, setDrafts] = useState([]);
    const [activeDraftId, setActiveDraftId] = useState(null);

    // Form states - Updated to match API structure
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        is_active: true,
        cover_photo: null,
        content1: '',
        image1: null,
        content2: '',
        image2: null,
        content3: '',
        image3: null,
        tags: []
    });

    const [editFormData, setEditFormData] = useState({
        id: null,
        title: '',
        slug: '',
        description: '',
        is_active: true,
        cover_photo: null,
        existing_cover_photo: null,
        content1: '',
        image1: null,
        existing_image1: null,
        content2: '',
        image2: null,
        existing_image2: null,
        content3: '',
        image3: null,
        existing_image3: null,
        tags: []
    });

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

    // Fetch individual project by ID
    const { data: projectData, isLoading: isProjectLoading, refetch: refetchProject } = useQuery({
        queryKey: ['project', editingProjectId],
        queryFn: () => {
            if (!editingProjectId) return Promise.resolve(null);
            return axios.get(
                `https://nexus-consults.com/api/admin/projects/${editingProjectId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ).then(res => res.data.data);
        },
        enabled: !!editingProjectId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // -------- Drafts utilities (IndexedDB via localforage) --------
    const DRAFTS_FALLBACK_KEY = 'projectDrafts_beforeunload_fallback';
    const loadDrafts = async () => {
        try {
            const list = await localforage.getItem(DRAFTS_STORAGE_KEY);
            const parsed = Array.isArray(list) ? list : [];
            setDrafts(parsed);

            // Merge any synchronous fallback saved during beforeunload
            const fbRaw = localStorage.getItem(DRAFTS_FALLBACK_KEY);
            if (fbRaw) {
                try {
                    const fb = JSON.parse(fbRaw);
                    if (fb && typeof fb === 'object') {
                        upsertDraft(fb);
                    }
                } catch (_) { /* ignore */ }
                localStorage.removeItem(DRAFTS_FALLBACK_KEY);
            }
        } catch (_) {
            // ignore
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
                // Try merge by slug to avoid duplicates when autosaving repeatedly
                const bySlugIdx = draft.slug ? prev.findIndex(d => d.slug === draft.slug && d.slug) : -1;
                if (bySlugIdx >= 0) {
                    next[bySlugIdx] = { ...prev[bySlugIdx], ...draft, id: prev[bySlugIdx].id, updatedAt: now };
                } else {
                    next.push({ ...draft, updatedAt: now });
                }
            }

            // Cap to 20 most recent drafts
            if (next.length > 20) {
                next = next
                    .slice()
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, 20);
            }

            // fire-and-forget persist
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
        // async load
        loadDrafts();
    }, []);

    const makeDraftFromForm = () => {
        // Avoid saving empty drafts
        const hasContent = (formData.title && formData.title.trim() !== '') ||
            (formData.description && formData.description.trim() !== '') ||
            (formData.content1 && formData.content1.trim() !== '') ||
            (formData.content2 && formData.content2.trim() !== '') ||
            (formData.content3 && formData.content3.trim() !== '');
        if (!hasContent) return null;
        // Reuse existing draft id by preference: activeDraftId, then existing by slug
        let id = activeDraftId;
        if (!id && formData.slug) {
            const existing = drafts.find(d => d.slug === formData.slug);
            if (existing) id = existing.id;
        }
        return {
            id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: formData.title,
            slug: formData.slug,
            description: formData.description,
            is_active: formData.is_active,
            content1: formData.content1,
            content2: formData.content2,
            content3: formData.content3,
            // images cannot be persisted; store only name/type hint
            cover_photo_meta: formData.cover_photo ? { name: formData.cover_photo.name, type: formData.cover_photo.type, size: formData.cover_photo.size } : null,
            image1_meta: formData.image1 ? { name: formData.image1.name, type: formData.image1.type, size: formData.image1.size } : null,
            image2_meta: formData.image2 ? { name: formData.image2.name, type: formData.image2.type, size: formData.image2.size } : null,
            image3_meta: formData.image3 ? { name: formData.image3.name, type: formData.image3.type, size: formData.image3.size } : null,
            tags: formData.tags || []
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
            description: draft.description || '',
            is_active: draft.is_active ?? true,
            content1: draft.content1 || '',
            content2: draft.content2 || '',
            content3: draft.content3 || '',
            cover_photo: null,
            image1: null,
            image2: null,
            image3: null,
            tags: draft.tags || []
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
            // start interval
            addAutoSaveInterval.current = setInterval(() => {
                const draft = makeDraftFromForm();
                if (draft) {
                    // Only save if content has actually changed
                    const currentContent = JSON.stringify({
                        title: draft.title,
                        description: draft.description,
                        content1: draft.content1,
                        content2: draft.content2,
                        content3: draft.content3,
                        tags: draft.tags
                    });

                    if (currentContent !== lastAutoSaveRef.current) {
                        setActiveDraftId(prev => prev || draft.id);
                        upsertDraft(draft);
                        lastAutoSaveRef.current = currentContent;
                    }
                }
            }, 5000); // 5s

            const onBeforeUnload = () => {
                const draft = makeDraftFromForm();
                if (draft) {
                    // Best-effort async persist
                    upsertDraft(draft);
                    // Guaranteed synchronous fallback for page unload
                    try {
                        localStorage.setItem(DRAFTS_FALLBACK_KEY, JSON.stringify(draft));
                    } catch (_) { /* ignore */ }
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

    const handleToggleStatus = async (projectId, currentStatus) => {
        setTogglingProjectId(projectId);
        try {
            await axios.patch(
                `https://nexus-consults.com/api/admin/projects/${projectId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Project ${currentStatus ? 'deactivated' : 'activated'} successfully`, { duration: 2000 });
            refetch();
        } catch (error) {
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
            if (error.response?.status == 401) {
                // localStorage.removeItem('userToken')
                // navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        } finally {
            setTogglingProjectId(null);
        }
    };

    const handleDeleteClick = (projectId) => {
        setProjectToDelete(projectId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;

        setDeletingProjectId(projectToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/admin/projects/${projectToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Project deleted successfully', { duration: 2000 });
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
            setDeletingProjectId(null);
            setProjectToDelete(null);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked, files } = e.target;

        if (type === 'file') {
            setFormData(prev => ({
                ...prev,
                [name]: files[0]
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }

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
        const { name, value, type, checked, files } = e.target;

        if (type === 'file') {
            setEditFormData(prev => ({
                ...prev,
                [name]: files[0]
            }));
        } else {
            setEditFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }

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

    const handletagsChange = (e) => {
        setFormData(prev => ({
            ...prev,
            tags: e.value
        }));
    };

    const handleEdittagsChange = (e) => {
        setEditFormData(prev => ({
            ...prev,
            tags: e.value
        }));
    };

    // Handle content change for individual content fields
    const handleContent1Change = (content) => {
        setFormData(prev => ({ ...prev, content1: content }));
    };

    const handleContent2Change = (content) => {
        setFormData(prev => ({ ...prev, content2: content }));
    };

    const handleContent3Change = (content) => {
        setFormData(prev => ({ ...prev, content3: content }));
    };

    const handleEditContent1Change = (content) => {
        setEditFormData(prev => ({ ...prev, content1: content }));
    };

    const handleEditContent2Change = (content) => {
        setEditFormData(prev => ({ ...prev, content2: content }));
    };
    const handleEditContent3Change = (content) => {
        setEditFormData(prev => ({ ...prev, content3: content }));
    };

    const resetForm = () => {
        setFormData({
            title: '',
            slug: '',
            description: '',
            is_active: true,
            cover_photo: null,
            content1: '',
            image1: null,
            content2: '',
            image2: null,
            content3: '',
            image3: null,
            tags: []
        });
        setIsSlugManuallyEdited(false);
    };

    const prepareEditForm = (project) => {
        setEditingProjectId(project.id);
        // The form will be populated when projectData is fetched
    };

    // Effect to populate edit form when project data is fetched
    useEffect(() => {
        if (projectData && editingProjectId) {
            // Map sections data to individual content and image fields
            const sections = projectData.sections || [];
            setEditFormData({
                id: projectData.id,
                title: projectData.title,
                slug: projectData.slug,
                description: projectData.description || '',
                is_active: projectData.is_active,
                cover_photo: null,
                existing_cover_photo: projectData.cover_photo,
                content1: sections[0]?.content || '',
                image1: null,
                existing_image1: sections[0]?.image || null,
                content2: sections[1]?.content || '',
                image2: null,
                existing_image2: sections[1]?.image || null,
                content3: sections[2]?.content || '',
                image3: null,
                existing_image3: sections[2]?.image || null,
                tags: projectData.tags || []
            });
            setIsEditSlugManuallyEdited(true);
            setShowEditModal(true);
        }
    }, [projectData, editingProjectId]);

    const handleAddProject = async (e) => {
        e.preventDefault();

        setUpdatingProject(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('slug', formData.slug);
            formDataToSend.append('is_active', formData.is_active ? 1 : 0);
            formDataToSend.append('content1', formData.content1);
            formDataToSend.append('content2', formData.content2);
            formDataToSend.append('content3', formData.content3);

            formData.tags.forEach(tag => {
                formDataToSend.append('tags[]', tag);
            });

            formDataToSend.append('cover_photo', formData.cover_photo || '');
            formDataToSend.append('image1', formData.image1 || '');
            formDataToSend.append('image2', formData.image2 || '');
            formDataToSend.append('image3', formData.image3 || '');

            formDataToSend.append('description', formData.description);

            await axios.post(
                'https://nexus-consults.com/api/admin/projects',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingProject(false);
            toast.success('Project added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
            // Remove matching draft by slug if exists
            clearMatchingDraftBySlug(formData.slug);
            setActiveDraftId(null);
        } catch (error) {
            setUpdatingProject(false);
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

    const handleUpdateProject = async (e) => {
        e.preventDefault();

        setUpdatingProject(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', editFormData.title);
            formDataToSend.append('slug', editFormData.slug);
            formDataToSend.append('is_active', editFormData.is_active ? 1 : 0);
            formDataToSend.append('content1', editFormData.content1);
            formDataToSend.append('content2', editFormData.content2);
            formDataToSend.append('content3', editFormData.content3);
            formDataToSend.append('description', editFormData.description);
            formDataToSend.append('_method', 'POST');

            editFormData.tags.forEach(tag => {
                formDataToSend.append('tags[]', tag);
            });

            // Only append images if they have been changed (new file selected)
            // For cover_photo
            if (editFormData.cover_photo instanceof File) {
                formDataToSend.append('cover_photo', editFormData.cover_photo);
            } else if (editFormData.existing_cover_photo === null) {
                // If existing_cover_photo is null, it means the image was removed
                formDataToSend.append('cover_photo', '');
            }
            // Otherwise, don't send cover_photo field to preserve existing image

            // For image1
            if (editFormData.image1 instanceof File) {
                formDataToSend.append('image1', editFormData.image1);
            } else if (editFormData.existing_image1 === null) {
                formDataToSend.append('image1', '');
            }

            // For image2
            if (editFormData.image2 instanceof File) {
                formDataToSend.append('image2', editFormData.image2);
            } else if (editFormData.existing_image2 === null) {
                formDataToSend.append('image2', '');
            }

            // For image3
            if (editFormData.image3 instanceof File) {
                formDataToSend.append('image3', editFormData.image3);
            } else if (editFormData.existing_image3 === null) {
                formDataToSend.append('image3', '');
            }

            await axios.post(
                `https://nexus-consults.com/api/admin/projects/${editFormData.id}`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingProject(false);
            toast.success('Project updated successfully', { duration: 2000 });
            setShowEditModal(false);
            setEditingProjectId(null);
            refetch();
            // Invalidate the project query to refetch fresh data
            queryClient.invalidateQueries(['project', editFormData.id]);
        } catch (error) {
            setUpdatingProject(false);
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

    // Filter projects based on all filter criteria
    const filteredProjects = projects?.filter(project => {
        // Text filters
        const matchesGlobal =
            filters.global === '' ||
            project.title.toLowerCase().includes(filters.global.toLowerCase()) ||
            (project.author?.name ? project.author.name.toLowerCase().includes(filters.global.toLowerCase()) : false);

        const matchesTitle = filters.title === '' || project.title.toLowerCase().includes(filters.title.toLowerCase());
        const matchesStatus = filters.status === '' || (filters.status === 'active' ? project.is_active : !project.is_active);
        const matchesAuthor =
            filters.author === '' || (project.author?.name ? project.author.name.toLowerCase().includes(filters.author.toLowerCase()) : false);

        // Date range filter on created_at
        let matchesDate = true;
        if (project.created_at) {
            const createdDate = new Date(project.created_at);
            if (filters.created_from) {
                const start = new Date(`${filters.created_from}T00:00:00`);
                if (createdDate < start) matchesDate = false;
            }
            if (matchesDate && filters.created_to) {
                const end = new Date(`${filters.created_to}T23:59:59.999`);
                if (createdDate > end) matchesDate = false;
            }
        }

        return matchesGlobal && matchesTitle && matchesStatus && matchesAuthor && matchesDate;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredProjects.length / rowsPerPage);
    const paginatedProjects = filteredProjects.slice(
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

    const emailsCountBadge = (count) => {
        const emailCount = count || 0;
        const colorClass = emailCount > 0
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'bg-gray-100 text-gray-600 border-gray-200';

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
                <FaEnvelope size={10} />
                {emailCount}
            </span>
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredProjects.length)} of {filteredProjects.length} entries
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

    // Handle individual project selection
    const handleSelectProject = (projectId, isSelected) => {
        if (isSelected) {
            setSelectedProjects(prev => [...prev, projectId]);
        } else {
            setSelectedProjects(prev => prev.filter(id => id !== projectId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedProjects(filteredProjects.map(project => project.id));
            setSelectAll(true);
        } else {
            setSelectedProjects([]);
            setSelectAll(false);
        }
    };

    // State for delete confirmation modal
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Bulk delete projects
    const handleBulkDelete = async () => {
        if (!selectedProjects.length) return;
        setShowBulkDeleteConfirm(true);
    };

    // Confirm bulk delete
    const confirmBulkDelete = async () => {
        setShowBulkDeleteConfirm(false);

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/admin/projects/bulk/delete',
                { ids: selectedProjects },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedProjects.length} project(s) deleted successfully`);
            setSelectedProjects([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting projects:', error);
            toast.error(error.response?.data?.message || 'Failed to delete projects');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Bulk update project status
    const handleBulkStatusUpdate = async (status) => {
        if (!selectedProjects.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/admin/projects/bulk/update-status',
                {
                    ids: selectedProjects,
                    status: status
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Status updated for ${selectedProjects.length} project(s)`);
            setSelectedProjects([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error updating project status:', error);
            toast.error(error.response?.data?.message || 'Failed to update project status');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Image upload component
    const ImageUpload = ({ name, label, existingImage, onImageChange, onRemoveImage }) => {
        const currentImage = editFormData[`${name}`] || formData[name];
        const existingImageUrl = showEditModal ? editFormData[`existing_${name}`] || existingImage : existingImage;

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                {currentImage ? (
                    <div className="relative mb-4">
                        <img
                            src={URL.createObjectURL(currentImage)}
                            alt="Preview"
                            className="h-48 w-full object-cover rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => onRemoveImage(name)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>
                ) : existingImageUrl ? (
                    <div className="relative mb-4">
                        <img
                            src={existingImageUrl}
                            alt="Current"
                            className="h-48 w-full object-cover rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => onRemoveImage(`existing_${name}`)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2"
                        >
                            <FaTimes size={16} />
                        </button>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FaImage className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
                                PNG, JPG, JPEG (MAX. 5MB)
                            </p>
                        </div>
                        <input
                            id={name}
                            name={name}
                            type="file"
                            className="hidden"
                            onChange={onImageChange}
                            accept="image/*"
                        />
                    </label>
                )}
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
                    placeholder="Search projects..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.admin?.permissions?.includes('create_projects') && <button
                    onClick={() => { setShowAddModal(true); resetForm() }}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Project</span>
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
                                        checked={selectAll && filteredProjects.length > 0}
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
                                Cover Photo
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
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <FaSpinner className="animate-spin" size={18} />
                                        Loading projects...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedProjects.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    No projects found
                                </td>
                            </tr>
                        ) : (
                            paginatedProjects.map((project) => (
                                <tr key={project.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedProjects.includes(project.id)}
                                                onChange={(e) => handleSelectProject(project.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                {project.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {project.author?.name || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {project.cover_photo && (
                                            <img
                                                src={project.cover_photo}
                                                alt="Cover"
                                                className="h-10 w-10 object-cover rounded"
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(project.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_projects') && <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => prepareEditForm(project)}
                                                disabled={isProjectLoading}
                                            >
                                                {isProjectLoading && editingProjectId === project.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    <FaEdit size={18} />
                                                )}
                                            </button>}
                                            <button
                                                className={`${project.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                onClick={() => handleToggleStatus(project.id, project.is_active)}
                                                disabled={togglingProjectId === project.id}
                                            >
                                                {togglingProjectId === project.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    project.is_active ? <FaTimes /> : <FaCheck />
                                                )}
                                            </button>
                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_projects') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(project.id)}
                                                disabled={deletingProjectId === project.id}
                                                title="Delete"
                                            >
                                                {deletingProjectId === project.id ? (
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
                            Are you sure you want to delete {selectedProjects.length} selected project(s)? This action cannot be undone.
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
            {selectedProjects.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedProjects.length} project(s) selected
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
                                    setSelectedProjects([]);
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
                                    <th className="px-4 py-2 text-left">Updated</th>
                                    <th className="px-4 py-2 text-left">Note</th>
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
                                            <td className="px-4 py-2">{new Date(d.updatedAt).toLocaleString()}</td>
                                            <td className="px-4 py-2 text-xs text-gray-500">
                                                {d.cover_photo_meta ? `Attachment: ${d.cover_photo_meta.name} (re-attach required)` : 'No attachment'}
                                            </td>
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

            {/* Add Project Modal */}
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
                            <h2 className="text-xl font-bold mb-4">Add New Project</h2>
                            <form onSubmit={handleAddProject}>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleFormChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border rounded-md resize-vertical"
                                        placeholder="Enter project description..."
                                    />
                                </div>

                                {/* Cover Photo Upload */}
                                <ImageUpload
                                    name="cover_photo"
                                    label="Cover Photo"
                                    onImageChange={handleFormChange}
                                    onRemoveImage={(name) => setFormData(prev => ({ ...prev, [name]: null }))}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                                <div className="mb-4">
                                    <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags</label>
                                    <Chips
                                        id="tags"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handletagsChange}
                                        placeholder="Enter tags"
                                        className="w-full p-chips dark:bg-dark2"
                                        itemTemplate={(tag) => (
                                            <div className="bg-gray-200 dark:bg-dark1 rounded-full px-3 py-1 text-sm">
                                                {tag}
                                            </div>
                                        )}
                                    />
                                </div>

                                {/* Content and Image Sections */}
                                <div className="space-y-6">
                                    {/* Section 1 */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-medium mb-4">Section 1*</h3>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Content 1*</label>
                                            <TiptapWithImg
                                                content={formData.content1}
                                                onUpdate={handleContent1Change}
                                            />
                                        </div>
                                        <ImageUpload
                                            name="image1"
                                            label="Image 1"
                                            onImageChange={handleFormChange}
                                            onRemoveImage={(name) => setFormData(prev => ({ ...prev, [name]: null }))}
                                        />
                                    </div>

                                    {/* Section 2 */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-medium mb-4">Section 2</h3>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Content 2</label>
                                            <TiptapWithImg
                                                content={formData.content2}
                                                onUpdate={handleContent2Change}
                                            />
                                        </div>
                                        <ImageUpload
                                            name="image2"
                                            label="Image 2"
                                            onImageChange={handleFormChange}
                                            onRemoveImage={(name) => setFormData(prev => ({ ...prev, [name]: null }))}
                                        />
                                    </div>

                                    {/* Section 3 */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-medium mb-4">Section 3</h3>
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Content 3</label>
                                            <TiptapWithImg
                                                content={formData.content3}
                                                onUpdate={handleContent3Change}
                                            />
                                        </div>
                                        <ImageUpload
                                            name="image3"
                                            label="Image 3"
                                            onImageChange={handleFormChange}
                                            onRemoveImage={(name) => setFormData(prev => ({ ...prev, [name]: null }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <div className="text-xs text-gray-500 mt-2 flex items-center">
                                        <FaSpinner className={`animate-spin mr-1 ${updatingProject ? 'opacity-100' : 'opacity-0'}`} size={12} />
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
                                        disabled={updatingProject}
                                    >
                                        {updatingProject ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Project</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Project Modal */}
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"

                >
                    <button onClick={() => {
                        setShowEditModal(false); setEditingProjectId(null);
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
                                        setEditingProjectId(null);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Projects
                                </button>
                                <span className="mx-2 text-gray-400">{'>'}</span>
                                <span className="text-xl font-bold text-gray-900">
                                    {editFormData.title || 'Untitled Project'}
                                </span>
                                {isProjectLoading && (
                                    <div className="ml-4 flex items-center text-sm text-gray-500">
                                        <FaSpinner className="animate-spin mr-2" size={14} />
                                        Loading project data...
                                    </div>
                                )}
                            </div>

                            {isProjectLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <FaSpinner className="animate-spin mr-2" size={24} />
                                    <span>Loading project data...</span>
                                </div>
                            ) : (
                                <form onSubmit={handleUpdateProject}>
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

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            name="description"
                                            value={editFormData.description}
                                            onChange={handleEditFormChange}
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-md resize-vertical"
                                            placeholder="Enter project description..."
                                        />
                                    </div>

                                    {/* Cover Photo Upload */}
                                    <ImageUpload
                                        name="cover_photo"
                                        label="Cover Photo"
                                        existingImage={editFormData.existing_cover_photo}
                                        onImageChange={handleEditFormChange}
                                        onRemoveImage={(name) => {
                                            if (name.startsWith('existing_')) {
                                                const fieldName = name.replace('existing_', '');
                                                setEditFormData(prev => ({ ...prev, [name]: null, [fieldName]: null }));
                                            } else {
                                                setEditFormData(prev => ({ ...prev, [name]: null }));
                                            }
                                        }}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

                                    <div className="mb-4">
                                        <label htmlFor="tags" className="block text-sm font-medium mb-1">Tags</label>
                                        <Chips
                                            id="tags"
                                            name="tags"
                                            value={editFormData.tags}
                                            onChange={handleEdittagsChange}
                                            placeholder="Enter tags"
                                            className="w-full p-chips dark:bg-dark2"
                                            itemTemplate={(tag) => (
                                                <div className="bg-gray-200 dark:bg-dark1 rounded-full px-3 py-1 text-sm">
                                                    {tag}
                                                </div>
                                            )}
                                        />
                                    </div>

                                    {/* Content and Image Sections */}
                                    <div className="space-y-6">
                                        {/* Section 1 */}
                                        <div className="p-4 border rounded-lg">
                                            <h3 className="text-lg font-medium mb-4">Section 1*</h3>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Content 1*</label>
                                                <TiptapWithImg
                                                    content={editFormData.content1}
                                                    onUpdate={handleEditContent1Change}
                                                />
                                            </div>
                                            <ImageUpload
                                                name="image1"
                                                label="Image 1"
                                                existingImage={editFormData.existing_image1}
                                                onImageChange={handleEditFormChange}
                                                onRemoveImage={(name) => {
                                                    if (name.startsWith('existing_')) {
                                                        const fieldName = name.replace('existing_', '');
                                                        setEditFormData(prev => ({ ...prev, [name]: null, [fieldName]: null }));
                                                    } else {
                                                        setEditFormData(prev => ({ ...prev, [name]: null }));
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Section 2 */}
                                        <div className="p-4 border rounded-lg">
                                            <h3 className="text-lg font-medium mb-4">Section 2</h3>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Content 2</label>
                                                <TiptapWithImg
                                                    content={editFormData.content2}
                                                    onUpdate={handleEditContent2Change}
                                                />
                                            </div>
                                            <ImageUpload
                                                name="image2"
                                                label="Image 2"
                                                existingImage={editFormData.existing_image2}
                                                onImageChange={handleEditFormChange}
                                                onRemoveImage={(name) => {
                                                    if (name.startsWith('existing_')) {
                                                        const fieldName = name.replace('existing_', '');
                                                        setEditFormData(prev => ({ ...prev, [name]: null, [fieldName]: null }));
                                                    } else {
                                                        setEditFormData(prev => ({ ...prev, [name]: null }));
                                                    }
                                                }}
                                            />
                                        </div>

                                        {/* Section 3 */}
                                        <div className="p-4 border rounded-lg">
                                            <h3 className="text-lg font-medium mb-4">Section 3</h3>
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Content 3</label>
                                                <TiptapWithImg
                                                    content={editFormData.content3}
                                                    onUpdate={handleEditContent3Change}
                                                />
                                            </div>
                                            <ImageUpload
                                                name="image3"
                                                label="Image 3"
                                                existingImage={editFormData.existing_image3}
                                                onImageChange={handleEditFormChange}
                                                onRemoveImage={(name) => {
                                                    if (name.startsWith('existing_')) {
                                                        const fieldName = name.replace('existing_', '');
                                                        setEditFormData(prev => ({ ...prev, [name]: null, [fieldName]: null }));
                                                    } else {
                                                        setEditFormData(prev => ({ ...prev, [name]: null }));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEditModal(false);
                                                setEditingProjectId(null);
                                            }}
                                            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                            disabled={updatingProject}
                                        >
                                            {updatingProject ? (
                                                <>
                                                    <FaSpinner className="animate-spin" size={18} />
                                                    <span>Updating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaCheck size={18} />
                                                    <span>Update Project</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Project</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this project? This action cannot be undone.
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