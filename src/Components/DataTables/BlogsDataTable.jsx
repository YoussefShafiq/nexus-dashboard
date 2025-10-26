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
import { Chips } from 'primereact/chips';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import localforage from 'localforage';
import DateRangePicker from '../ReusableComponents/DateRangePicker';
import { XCircle } from 'lucide-react';

export default function BlogsDataTable({ blogs, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedBlogs, setSelectedBlogs] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [filters, setFilters] = useState({
        global: '',
        title: '',
        category: '',
        status: '',
        author: '',
        created_from: '', // YYYY-MM-DD
        created_to: '' // YYYY-MM-DD
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingBlogId, setDeletingBlogId] = useState(null);
    const [togglingBlogId, setTogglingBlogId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [blogToDelete, setBlogToDelete] = useState(null);
    const [updatingBlog, setUpdatingBlog] = useState(false);
    const [headings, setHeadings] = useState([]);
    const [editHeadings, setEditHeadings] = useState([]);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [isEditSlugManuallyEdited, setIsEditSlugManuallyEdited] = useState(false);
    const [showFaqModal, setShowFaqModal] = useState(false);
    const [currentBlogId, setCurrentBlogId] = useState(null);
    const [faqForm, setFaqForm] = useState({
        question: '',
        answer: '',
        order: ''
    });
    const [editingFaqId, setEditingFaqId] = useState(null);
    const [showDeleteFaqConfirm, setShowDeleteFaqConfirm] = useState(false);
    const [faqToDelete, setFaqToDelete] = useState(null);
    const [previewBlog, setPreviewBlog] = useState(null);

    // Drafts (client-side only)
    const DRAFTS_STORAGE_KEY = 'blogDrafts';
    const [drafts, setDrafts] = useState([]);
    const [activeDraftId, setActiveDraftId] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        category: 'news',
        is_active: true,
        mark_as_hero: false,
        content: '',
        cover_photo: null,
        tags: [],
        headings: []
    });

    const [editFormData, setEditFormData] = useState({
        id: null,
        title: '',
        slug: '',
        category: 'news',
        is_active: true,
        mark_as_hero: false,
        content: '',
        cover_photo: null,
        existing_cover_photo: null,
        tags: [],
        headings: []
    });

    // Fetch FAQs for a blog
    const { data: faqs, refetch: refetchFaqs } = useQuery({
        queryKey: ['blogFaqs', currentBlogId],
        queryFn: () => {
            if (!currentBlogId) return Promise.resolve([]);
            return axios.get(`https://nexus-consults.com/api/public/api/admin/blogs/${currentBlogId}/manage/faq`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            }).then(res => res.data.data);
        },
        enabled: !!currentBlogId
    });

    // Mutation for adding FAQ
    const addFaqMutation = useMutation({
        mutationFn: (newFaq) => {
            return axios.post(
                `https://nexus-consults.com/api/public/api/admin/blogs/${currentBlogId}/manage/faq`,
                newFaq,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('FAQ added successfully');
            refetchFaqs();
            setFaqForm({ question: '', answer: '', order: '' });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to add FAQ');
            if (error.response?.status === 401) {
                localStorage.removeItem('userToken');
                navigate('/login');
            }
            if (error.response?.status === 403) {
                toast.error('You are not authorized to perform this action');
            }
        }
    });

    // Mutation for updating FAQ
    const updateFaqMutation = useMutation({
        mutationFn: (updatedFaq) => {
            return axios.put(
                `https://nexus-consults.com/api/public/api/admin/blogs/${currentBlogId}/manage/faq/${editingFaqId}`,
                updatedFaq,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('FAQ updated successfully');
            refetchFaqs();
            setEditingFaqId(null);
            setFaqForm({ question: '', answer: '', order: '' });
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update FAQ');
            if (error.response?.status === 401) {
                localStorage.removeItem('userToken');
                navigate('/login');
            }
            if (error.response?.status === 403) {
                toast.error('You are not authorized to perform this action');
            }
        }
    });

    // Mutation for deleting FAQ
    const deleteFaqMutation = useMutation({
        mutationFn: (faqId) => {
            return axios.delete(
                `https://nexus-consults.com/api/public/api/admin/blogs/${currentBlogId}/manage/faq/${faqId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
        },
        onSuccess: () => {
            toast.success('FAQ deleted successfully');
            refetchFaqs();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete FAQ');
            if (error.response?.status === 401) {
                localStorage.removeItem('userToken');
                navigate('/login');
            }
            if (error.response?.status === 403) {
                toast.error('You are not authorized to perform this action');
            }
        }
    });

    // Handler functions for headings
    const handleHeadingsUpdate = (extractedHeadings) => {
        setHeadings(extractedHeadings);
        setFormData(prev => ({ ...prev, headings: extractedHeadings }));
    };

    // -------- Drafts utilities (IndexedDB via localforage) --------
    const DRAFTS_FALLBACK_KEY = 'blogDrafts_beforeunload_fallback';
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
        const hasContent = (formData.title && formData.title.trim() !== '') || (formData.content && formData.content.trim() !== '');
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
            category: formData.category,
            is_active: formData.is_active,
            mark_as_hero: formData.mark_as_hero,
            content: formData.content,
            // cover_photo cannot be persisted; store only name/type hint
            cover_photo_meta: formData.cover_photo ? { name: formData.cover_photo.name, type: formData.cover_photo.type, size: formData.cover_photo.size } : null,
            tags: formData.tags,
            headings: formData.headings
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
            category: draft.category || 'news',
            is_active: draft.is_active ?? true,
            mark_as_hero: draft.mark_as_hero ?? false,
            content: draft.content || '',
            cover_photo: null, // user must reattach file
            tags: draft.tags || [],
            headings: draft.headings || []
        });
        setHeadings(draft.headings || []);
        setIsSlugManuallyEdited(true);
        setActiveDraftId(draft.id);
        setShowAddModal(true);
        toast('Draft loaded');
    };

    // Auto-save while Add modal is open
    const addAutoSaveInterval = useRef(null);
    useEffect(() => {
        if (showAddModal) {
            // start interval
            addAutoSaveInterval.current = setInterval(() => {
                const draft = makeDraftFromForm();
                if (draft) {
                    setActiveDraftId(prev => prev || draft.id);
                    upsertDraft(draft);
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
        }
    }, [showAddModal, formData]);

    const handleEditHeadingsUpdate = (extractedHeadings) => {
        setEditHeadings(extractedHeadings);
        setEditFormData(prev => ({ ...prev, headings: extractedHeadings }));
    };

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

    const { data: currentUser, isLoading: isCurrentuserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/public/api/admin/auth/profile',
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')} `
                    }
                })
        }
    });

    const handleToggleStatus = async (blogId, currentStatus) => {
        setTogglingBlogId(blogId);
        try {
            await axios.patch(
                `https://nexus-consults.com/api/public/api/admin/blogs/${blogId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Blog ${currentStatus ? 'deactivated' : 'activated'} successfully`, { duration: 2000 });
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
            setTogglingBlogId(null);
        }
    };

    const handleDeleteClick = (blogId) => {
        setBlogToDelete(blogId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!blogToDelete) return;

        setDeletingBlogId(blogToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/public/api/admin/blogs/${blogToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Blog deleted successfully', { duration: 2000 });
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
            setDeletingBlogId(null);
            setBlogToDelete(null);
        }
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked, files } = e.target;

        if (type === 'file') {
            setFormData(prev => ({
                ...prev,
                [name]: files[0]
            }));
            // We cannot persist files reliably in localStorage; user will need to reattach on resume.
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

    const resetForm = () => {
        setFormData({
            title: '',
            slug: '',
            category: 'news',
            is_active: true,
            mark_as_hero: true,
            content: '',
            cover_photo: null,
            tags: [],
            headings: []
        });
        setHeadings([]);
        setIsSlugManuallyEdited(false);
    };

    const prepareEditForm = (blog) => {
        setEditFormData({
            id: blog.id,
            title: blog.title,
            slug: blog.slug,
            category: blog.category,
            is_active: blog.is_active,
            mark_as_hero: blog.mark_as_hero,
            content: blog.content,
            cover_photo: null,
            existing_cover_photo: blog.cover_photo,
            tags: blog.tags || [],
            headings: blog.headings || []
        });
        setEditHeadings(blog.headings || []);
        setIsEditSlugManuallyEdited(true); // Assume slug was manually edited when editing
        setShowEditModal(true);
    };

    const handleAddBlog = async (e) => {
        e.preventDefault();

        setUpdatingBlog(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('slug', formData.slug);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('is_active', formData.is_active ? 1 : 0);
            formDataToSend.append('mark_as_hero', formData.mark_as_hero ? 1 : 0);
            formDataToSend.append('content', formData.content);
            formDataToSend.append('headings', JSON.stringify(formData.headings));
            formData.tags.forEach(skill => {
                formDataToSend.append('tags[]', skill);
            });
            if (formData.cover_photo) {
                formDataToSend.append('cover_photo', formData.cover_photo);
            }

            await axios.post(
                'https://nexus-consults.com/api/public/api/admin/blogs',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingBlog(false);
            toast.success('Blog added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
            // Remove matching draft by slug if exists
            clearMatchingDraftBySlug(formData.slug);
            setActiveDraftId(null);
        } catch (error) {
            setUpdatingBlog(false);
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

    const handleUpdateBlog = async (e) => {
        e.preventDefault();

        // Clear the auto-save interval when manually submitting
        if (autoSubmitInterval.current) {
            clearInterval(autoSubmitInterval.current);
        }

        setUpdatingBlog(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', editFormData.title);
            formDataToSend.append('slug', editFormData.slug);
            formDataToSend.append('category', editFormData.category);
            formDataToSend.append('is_active', editFormData.is_active ? 1 : 0);
            formDataToSend.append('mark_as_hero', editFormData.mark_as_hero ? 1 : 0);
            formDataToSend.append('content', editFormData.content);
            formDataToSend.append('headings', JSON.stringify(editFormData.headings));
            editFormData.tags.forEach(skill => {
                formDataToSend.append('tags[]', skill);
            });
            formDataToSend.append('_method', 'put');
            if (editFormData.cover_photo) {
                formDataToSend.append('cover_photo', editFormData.cover_photo);
            }

            await axios.post(
                `https://nexus-consults.com/api/public/api/admin/blogs/${editFormData.id}`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingBlog(false);
            toast.success('Blog updated successfully', { duration: 2000 });
            setShowEditModal(false);
            refetch();
        } catch (error) {
            setUpdatingBlog(false);
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

    const handleAutoUpdateBlog = async () => {
        // Don't submit if already updating or if form is empty
        if (updatingBlog || !editFormData.title || !editFormData.content) return;

        setUpdatingBlog(true);

        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', editFormData.title);
            formDataToSend.append('slug', editFormData.slug);
            formDataToSend.append('category', editFormData.category);
            formDataToSend.append('is_active', editFormData.is_active ? 1 : 0);
            formDataToSend.append('mark_as_hero', editFormData.mark_as_hero ? 1 : 0);
            formDataToSend.append('content', editFormData.content);
            formDataToSend.append('headings', JSON.stringify(editFormData.headings));
            editFormData.tags.forEach(skill => {
                formDataToSend.append('tags[]', skill);
            });
            formDataToSend.append('_method', 'POST');
            if (editFormData.cover_photo) {
                formDataToSend.append('cover_photo', editFormData.cover_photo);
            }

            await axios.post(
                `https://nexus-consults.com/api/public/api/admin/blogs/${editFormData.id}`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            // Show subtle notification for auto-save
            toast.success('Auto-saved successfully', {
                duration: 2000,
                icon: '✅'
            });

        } catch (error) {
            console.error('Auto-save failed:', error);
            // Don't show error toast for auto-save to avoid annoying the user
        } finally {
            setUpdatingBlog(false);
        }
    };

    const autoSubmitInterval = useRef(null);

    // Set up the auto-submit interval
    useEffect(() => {
        if (showEditModal) {
            // Start auto-submitting every 30 seconds only when edit modal is open
            autoSubmitInterval.current = setInterval(() => {
                handleAutoUpdateBlog();
            }, 30000); // 30 seconds
        } else {
            // Clear interval when modal closes
            if (autoSubmitInterval.current) {
                clearInterval(autoSubmitInterval.current);
            }
        }

        // Clean up the interval when component unmounts
        return () => {
            if (autoSubmitInterval.current) {
                clearInterval(autoSubmitInterval.current);
            }
        };
    }, [showEditModal, editFormData]); // Re-run when modal visibility changes

    // Open FAQ modal and set current blog ID
    const handleOpenFaqModal = (blogId) => {
        setCurrentBlogId(blogId);
        setShowFaqModal(true);
    };

    // Handle FAQ form changes
    const handleFaqFormChange = (e) => {
        const { name, value } = e.target;
        setFaqForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Submit FAQ form (add or update)
    const handleFaqSubmit = (e) => {
        e.preventDefault();
        if (editingFaqId) {
            updateFaqMutation.mutate(faqForm);
        } else {
            addFaqMutation.mutate(faqForm);
        }
    };

    // Edit FAQ
    const handleEditFaq = (faq) => {
        setEditingFaqId(faq.id);
        setFaqForm({
            question: faq.question,
            answer: faq.answer,
            order: faq.order
        });
    };

    // Cancel FAQ editing
    const handleCancelEditFaq = () => {
        setEditingFaqId(null);
        setFaqForm({ question: '', answer: '', order: '' });
    };

    // Delete FAQ
    const handleDeleteFaq = (faqId) => {
        setFaqToDelete(faqId);
        setShowDeleteFaqConfirm(true);
    };

    const handleConfirmDeleteFaq = () => {
        if (!faqToDelete) return;
        deleteFaqMutation.mutate(faqToDelete);
        setShowDeleteFaqConfirm(false);
        setFaqToDelete(null);
    };

    // Filter blogs based on all filter criteria
    const filteredBlogs = blogs?.filter(blog => {
        // Text filters
        const matchesGlobal =
            filters.global === '' ||
            blog.title.toLowerCase().includes(filters.global.toLowerCase()) ||
            blog.category.toLowerCase().includes(filters.global.toLowerCase()) ||
            (blog.author?.name ? blog.author.name.toLowerCase().includes(filters.global.toLowerCase()) : false);

        const matchesTitle = filters.title === '' || blog.title.toLowerCase().includes(filters.title.toLowerCase());
        const matchesCategory = filters.category === '' || blog.category.includes(filters.category.toLowerCase());
        const matchesStatus = filters.status === '' || (filters.status === 'active' ? blog.is_active : !blog.is_active);
        const matchesAuthor =
            filters.author === '' || (blog.author?.name ? blog.author.name.toLowerCase().includes(filters.author.toLowerCase()) : false);

        // Date range filter on created_at
        let matchesDate = true;
        if (blog.created_at) {
            const createdDate = new Date(blog.created_at);
            if (filters.created_from) {
                const start = new Date(`${filters.created_from}T00:00:00`);
                if (createdDate < start) matchesDate = false;
            }
            if (matchesDate && filters.created_to) {
                const end = new Date(`${filters.created_to}T23:59:59.999`);
                if (createdDate > end) matchesDate = false;
            }
        }

        return matchesGlobal && matchesTitle && matchesCategory && matchesStatus && matchesAuthor && matchesDate;
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredBlogs.length / rowsPerPage);
    const paginatedBlogs = filteredBlogs.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const categoryBadge = (category) => {
        const categories = {
            'news': 'bg-blue-100 text-blue-800',
            'trending': 'bg-pink-100 text-pink-800'
        };
        return (
            <span className={`${categories[category] || 'bg-gray-100 text-gray-800'} text-xs font-medium px-2.5 py-1 rounded capitalize`}>
                {category}
            </span>
        );
    };

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
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredBlogs.length)} of {filteredBlogs.length} entries
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

    // Preview Modal Component
    const PreviewModal = ({ blog, onClose }) => {
        if (!blog) return null;

        return (
            <div
                className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                    {/* Overlay */}
                    <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                        <div className="absolute inset-0 bg-black opacity-75"></div>
                    </div>

                    {/* Modal Content */}
                    <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl m-auto sm:w-full max-h-[90vh] flex flex-col">
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-grow overflow-y-auto">
                            <div className="sm:flex sm:items-start justify-between">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                    Blog Preview
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                >
                                    <FaTimesCircle className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Blog Content */}
                            <div className="content-container">
                                {/* Hero Section */}
                                <div className="flex flex-col lg:flex-row gap-8 mb-12">
                                    <div className="lg:w-1/2 font-bold">
                                        <span className='text-blue-600 capitalize'>{blog.category}</span>
                                        <h1 className='lg:text-[54px] text-3xl font-extrabold lg:leading-[67px]'>{blog.title}</h1>
                                        <div className="mt-5">
                                            <p>By Admin</p>
                                            <div className="flex gap-2 items-center text-sm font-medium mt-3">
                                                <p>5 minutes read</p>
                                                <div className="h-full w-[1px] bg-gray-400"></div>
                                                <p>Published {new Date(blog.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="lg:w-1/2">
                                        {blog.cover_photo && (
                                            <div className="flex justify-center">
                                                <img
                                                    src={blog.cover_photo}
                                                    alt='cover photo'
                                                    className='w-full max-h-[500px] object-contain rounded-lg'
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Blog Content */}
                                <div className="content" dangerouslySetInnerHTML={{ __html: blog.content }} />

                                {/* Tags */}
                                {blog.tags && blog.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-3 mt-8">
                                        {blog.tags.map((tag, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Handle individual blog selection
    const handleSelectBlog = (blogId, isSelected) => {
        if (isSelected) {
            setSelectedBlogs(prev => [...prev, blogId]);
        } else {
            setSelectedBlogs(prev => prev.filter(id => id !== blogId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedBlogs(filteredBlogs.map(blog => blog.id));
            setSelectAll(true);
        } else {
            setSelectedBlogs([]);
            setSelectAll(false);
        }
    };

    // State for delete confirmation modal
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Bulk delete blogs
    const handleBulkDelete = async () => {
        if (!selectedBlogs.length) return;
        setShowBulkDeleteConfirm(true);
    };

    // Confirm bulk delete
    const confirmBulkDelete = async () => {
        setShowBulkDeleteConfirm(false);

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/public/api/admin/blogs/bulk/delete',
                { ids: selectedBlogs },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedBlogs.length} blog(s) deleted successfully`);
            setSelectedBlogs([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting blogs:', error);
            toast.error(error.response?.data?.message || 'Failed to delete blogs');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Bulk update blog status
    const handleBulkStatusUpdate = async (status) => {
        if (!selectedBlogs.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/public/api/admin/blogs/bulk/update-status',
                {
                    ids: selectedBlogs,
                    status: status
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Status updated for ${selectedBlogs.length} blog(s)`);
            setSelectedBlogs([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error updating blog status:', error);
            toast.error(error.response?.data?.message || 'Failed to update blog status');
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
                    placeholder="Search blogs..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {true && <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Blog</span>
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
                                        checked={selectAll && filteredBlogs.length > 0}
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
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="text-xs p-1 border rounded w-full"
                                >
                                    <option value="">All Categories</option>
                                    <option value="news">News</option>
                                    <option value="trending">Trending</option>
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
                                        Loading blogs...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedBlogs.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-3 py-4 text-center">
                                    No blogs found
                                </td>
                            </tr>
                        ) : (
                            paginatedBlogs.map((blog) => (
                                <tr key={blog.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedBlogs.includes(blog.id)}
                                                onChange={(e) => handleSelectBlog(blog.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                {blog.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {blog.author?.name || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {blog.cover_photo && (
                                            <img
                                                src={blog.cover_photo}
                                                alt="Cover"
                                                className="h-10 w-10 object-cover rounded"
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {categoryBadge(blog.category)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(blog.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {blog.created_at ? new Date(blog.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_blogs') && <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => prepareEditForm(blog)}
                                            >
                                                <FaEdit size={18} />
                                            </button>}
                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_blogs') && <button
                                                className={`${!blog.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                onClick={() => handleToggleStatus(blog.id, blog.is_active)}
                                                disabled={togglingBlogId === blog.id}
                                            >
                                                {togglingBlogId === blog.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    !blog.is_active ? <FaTimes /> : <FaCheck />
                                                )}
                                            </button>}
                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_blogs') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(blog.id)}
                                                disabled={deletingBlogId === blog.id}
                                                title="Delete"
                                            >
                                                {deletingBlogId === blog.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    <FaTrashAlt size={18} />
                                                )}
                                            </button>}
                                            {/* <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => handleOpenFaqModal(blog.id)}
                                                title="Manage FAQs"
                                            >
                                                <FaQuestionCircle size={18} />
                                            </button> */}
                                            <button
                                                className="text-green-500 hover:text-green-700 p-1"
                                                onClick={() => setPreviewBlog(blog)}
                                                title="Preview Blog"
                                            >
                                                <FaEye size={18} />
                                            </button>
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
                            Are you sure you want to delete {selectedBlogs.length} selected blog(s)? This action cannot be undone.
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
            {selectedBlogs.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedBlogs.length} blog(s) selected
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
                                    setSelectedBlogs([]);
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
                                    <th className="px-4 py-2 text-left">Category</th>
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
                                            <td className="px-4 py-2 capitalize">{d.category || '-'}</td>
                                            <td className="px-4 py-2">{new Date(d.updatedAt).toLocaleString()}</td>
                                            <td className="px-4 py-2 text-xs text-gray-500">{d.cover_photo_meta ? `Attachment: ${d.cover_photo_meta.name} (re-attach required)` : 'No attachment'}</td>
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

            {/* Add Blog Modal */}
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
                        className="bg-white rounded-lg shadow-xl w-5/6  h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="">
                        </div>
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Add New Blog</h2>
                            <form onSubmit={handleAddBlog}>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        >
                                            <option value="news">News</option>
                                            <option value="trending">Trending</option>
                                        </select>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
                                    {formData.cover_photo ? (
                                        <div className="relative mb-4">
                                            <img
                                                src={URL.createObjectURL(formData.cover_photo)}
                                                alt="Preview"
                                                className="h-48 w-full object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, cover_photo: null }))}
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
                                                id="cover_photo"
                                                name="cover_photo"
                                                type="file"
                                                className="hidden"
                                                onChange={handleFormChange}
                                                accept="image/*"
                                            />
                                        </label>
                                    )}
                                </div>

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
                                        itemTemplate={(skill) => (
                                            <div className="bg-gray-200 dark:bg-dark1 rounded-full px-3 py-1 text-sm">
                                                {skill}
                                            </div>
                                        )}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content*</label>
                                    <TiptapWithImg
                                        content={formData.content}
                                        onUpdate={(content) => setFormData(prev => ({ ...prev, content }))}
                                        onHeadingsUpdate={handleHeadingsUpdate}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <div className="text-xs text-gray-500 mt-2 flex items-center">
                                        <FaSpinner className={`animate-spin mr-1 ${updatingBlog ? 'opacity-100' : 'opacity-0'}`} size={12} />
                                        Auto-saves to drafts every 10s
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
                                        disabled={updatingBlog}
                                    >
                                        {updatingBlog ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Blog</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Blog Modal */}
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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
                        className="bg-white rounded-lg shadow-xl w-5/6 h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="flex items-center mb-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Blogs
                                </button>
                                <span className="mx-2 text-gray-400">{'>'}</span>
                                <span className="text-xl font-bold text-gray-900">
                                    {editFormData.title || 'Untitled Blog'}
                                </span>
                            </div>
                            <form onSubmit={handleUpdateBlog}>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category*</label>
                                        <select
                                            name="category"
                                            value={editFormData.category}
                                            onChange={handleEditFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        >
                                            <option value="news">News</option>
                                            <option value="trending">Trending</option>
                                        </select>
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
                                    {editFormData.cover_photo ? (
                                        <div className="relative mb-4">
                                            <img
                                                src={URL.createObjectURL(editFormData.cover_photo)}
                                                alt="Preview"
                                                className="h-48 w-full object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditFormData(prev => ({ ...prev, cover_photo: null }))}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2"
                                            >
                                                <FaTimes size={16} />
                                            </button>
                                        </div>
                                    ) : editFormData.existing_cover_photo ? (
                                        <div className="relative mb-4">
                                            <img
                                                src={editFormData.existing_cover_photo}
                                                alt="Current Cover"
                                                className="h-48 w-full object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setEditFormData(prev => ({ ...prev, existing_cover_photo: null }))}
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
                                                id="edit_cover_photo"
                                                name="cover_photo"
                                                type="file"
                                                className="hidden"
                                                onChange={handleEditFormChange}
                                                accept="image/*"
                                            />
                                        </label>
                                    )}
                                </div>

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
                                    <label htmlFor="tags" className="block text-sm font-medium mb-1">tags</label>
                                    <Chips
                                        id="tags"
                                        name="tags"
                                        value={editFormData.tags}
                                        onChange={handleEdittagsChange}
                                        placeholder="Enter tags"
                                        className="w-full p-chips dark:bg-dark2"
                                        itemTemplate={(skill) => (
                                            <div className="bg-gray-200 dark:bg-dark1 rounded-full px-3 py-1 text-sm">
                                                {skill}
                                            </div>
                                        )}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                    <TiptapWithImg
                                        content={editFormData.content}
                                        onUpdate={(content) => setEditFormData(prev => ({ ...prev, content }))}
                                        onHeadingsUpdate={handleEditHeadingsUpdate}
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    {/* Add this inside your edit form, before the submit button */}
                                    <div className="text-xs text-gray-500 mt-2 flex items-center">
                                        <FaSpinner className={`animate-spin mr-1 ${updatingBlog ? 'opacity-100' : 'opacity-0'}`} size={12} />
                                        {updatingBlog ? 'Auto-saving...' : 'Form will auto-save every 30 seconds'}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditModal(false); refetch(); }}
                                        className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                        disabled={updatingBlog}
                                    >
                                        {updatingBlog ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaCheck size={18} />
                                                <span>Update Blog</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Blog</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this blog? This action cannot be undone.
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

            {/* FAQ Management Modal */}
            {showFaqModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => {
                        setShowFaqModal(false);
                        setCurrentBlogId(null);
                        setEditingFaqId(null);
                        setFaqForm({ question: '', answer: '', order: '' });
                    }}
                >
                    <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Manage FAQs</h2>

                            {/* FAQ Form */}
                            <form onSubmit={handleFaqSubmit} className="mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Question*</label>
                                        <input
                                            type="text"
                                            name="question"
                                            value={faqForm.question}
                                            onChange={handleFaqFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Order*</label>
                                        <input
                                            type="number"
                                            name="order"
                                            value={faqForm.order}
                                            onChange={handleFaqFormChange}
                                            className="w-full px-3 py-2 border rounded-md"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Answer*</label>
                                    <textarea
                                        name="answer"
                                        value={faqForm.answer}
                                        onChange={handleFaqFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        rows="3"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    {editingFaqId && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEditFaq}
                                            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                        disabled={addFaqMutation.isPending || updateFaqMutation.isPending}
                                    >
                                        {(addFaqMutation.isPending || updateFaqMutation.isPending) ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>{editingFaqId ? 'Updating...' : 'Adding...'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaCheck size={18} />
                                                <span>{editingFaqId ? 'Update FAQ' : 'Add FAQ'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* FAQs List */}
                            <div>
                                <h3 className="text-lg font-medium mb-2">Existing FAQs</h3>
                                {faqs?.length === 0 ? (
                                    <p className="text-gray-500">No FAQs found for this blog.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {faqs?.map((faq) => (
                                            <div key={faq.id} className="border rounded-lg p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium">{faq.question}</h4>
                                                        <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                                                        <div className="text-xs text-gray-500 mt-2">
                                                            Order: {faq.order}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEditFaq(faq)}
                                                            className="text-blue-500 hover:text-blue-700 p-1"
                                                        >
                                                            <FaEdit size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFaq(faq.id)}
                                                            className="text-red-500 hover:text-red-700 p-1"
                                                            disabled={deleteFaqMutation.isPending}
                                                        >
                                                            {deleteFaqMutation.isPending && deleteFaqMutation.variables === faq.id ? (
                                                                <FaSpinner className="animate-spin" size={16} />
                                                            ) : (
                                                                <FaTrashAlt size={16} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFaqModal(false);
                                        setCurrentBlogId(null);
                                        setEditingFaqId(null);
                                        setFaqForm({ question: '', answer: '', order: '' });
                                    }}
                                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Delete FAQ Confirmation Modal */}
            {showDeleteFaqConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDeleteFaqConfirm(false)}
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete FAQ</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this FAQ? This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteFaqConfirm(false)}
                                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDeleteFaq}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                    disabled={deleteFaqMutation.isPending}
                                >
                                    {deleteFaqMutation.isPending ? (
                                        <>
                                            <FaSpinner className="animate-spin mr-2" />
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Preview Modal */}
            <AnimatePresence>
                {previewBlog && (
                    <PreviewModal
                        blog={previewBlog}
                        onClose={() => setPreviewBlog(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}