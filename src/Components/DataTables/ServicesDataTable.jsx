import React, { useEffect, useRef, useState, useCallback } from 'react';
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
    FaFolderOpen,
    FaTrash
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

export default function ServicesDataTable({ services, disciplinesData, loading, refetch }) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedServices, setSelectedServices] = useState([]);
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
    const [deletingServiceId, setDeletingServiceId] = useState(null);
    const [togglingServiceId, setTogglingServiceId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);
    const [updatingService, setUpdatingService] = useState(false);
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [isEditSlugManuallyEdited, setIsEditSlugManuallyEdited] = useState(false);
    const [editingServiceId, setEditingServiceId] = useState(null);

    const DRAFTS_STORAGE_KEY = 'serviceDrafts';
    const [drafts, setDrafts] = useState([]);
    const [activeDraftId, setActiveDraftId] = useState(null);

    // Form states - Updated with dynamic sections
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        is_active: true,
        cover_photo: null,
        disciplines: [],
        sections: [] // Changed from fixed content1-3 to dynamic sections array
    });

    const [editFormData, setEditFormData] = useState({
        id: null,
        title: '',
        slug: '',
        description: '',
        is_active: true,
        cover_photo: null,
        existing_cover_photo: null,
        disciplines: [],
        sections: [] // Changed from fixed content1-3 to dynamic sections array
    });

    // Fetch current user for permissions
    const { data: currentUser, isLoading: isCurrentuserLoading } = useQuery({
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

    // Fetch individual service by ID
    const { data: serviceData, isLoading: isServiceLoading, refetch: refetchService } = useQuery({
        queryKey: ['service', editingServiceId],
        queryFn: () => {
            if (!editingServiceId) return Promise.resolve(null);
            return axios.get(
                `https://nexus-consults.com/api/public/api/admin/services/${editingServiceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            ).then(res => res.data.data);
        },
        enabled: !!editingServiceId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // -------- Drafts utilities (IndexedDB via localforage) --------
    const DRAFTS_FALLBACK_KEY = 'serviceDrafts_beforeunload_fallback';
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
            formData.sections.some(section => section.content && section.content.trim() !== '');

        if (!hasContent) return null;

        // Reuse existing draft id by preference: activeDraftId, then existing by slug
        let id = activeDraftId;
        if (!id && formData.slug) {
            const existing = drafts.find(d => d.slug === formData.slug);
            if (existing) id = existing.id;
        }

        // Process sections for draft storage
        const sectionsForDraft = formData.sections.map(section => ({
            content: section.content || '',
            caption: section.caption || '', // ADDED: Save caption to draft
            image_meta: section.image ? { name: section.image.name, type: section.image.type, size: section.image.size } : null,
            existing_image: section.existing_image || null
        }));

        return {
            id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: formData.title,
            slug: formData.slug,
            description: formData.description,
            is_active: formData.is_active,
            disciplines: formData.disciplines || [],
            sections: sectionsForDraft,
            cover_photo_meta: formData.cover_photo ? { name: formData.cover_photo.name, type: formData.cover_photo.type, size: formData.cover_photo.size } : null,
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
        // Restore sections from draft
        const restoredSections = draft.sections?.map(section => ({
            id: Date.now() + Math.random(),
            content: section.content || '',
            caption: section.caption || '', // ADDED: Restore caption from draft
            image: null,
            existing_image: section.existing_image || null
        })) || [];

        setFormData({
            title: draft.title || '',
            slug: draft.slug || '',
            description: draft.description || '',
            is_active: draft.is_active ?? true,
            disciplines: draft.disciplines || [],
            sections: restoredSections,
            cover_photo: null,
        });
        setIsSlugManuallyEdited(true);
        setActiveDraftId(draft.id);
        setShowAddModal(true);
        toast('Draft loaded');
    };

    // Add this ref at the top with your other refs
    const addAutoSaveInterval = useRef(null);
    const lastAutoSaveRef = useRef(''); // ADD THIS LINE

    // Auto-save while Add modal is open
    useEffect(() => {
        if (showAddModal) {
            // start interval
            addAutoSaveInterval.current = setInterval(() => {
                const draft = makeDraftFromForm();
                if (draft) {
                    // Include disciplines and sections in the content check
                    const currentContent = JSON.stringify({
                        title: draft.title,
                        description: draft.description,
                        disciplines: draft.disciplines,
                        sections: draft.sections
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
                lastAutoSaveRef.current = ''; // ADD THIS LINE
            };
        } else {
            if (addAutoSaveInterval.current) clearInterval(addAutoSaveInterval.current);
            lastAutoSaveRef.current = ''; // ADD THIS LINE
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

    const handleToggleStatus = async (serviceId, currentStatus) => {
        setTogglingServiceId(serviceId);
        try {
            await axios.patch(
                `https://nexus-consults.com/api/public/api/admin/services/${serviceId}/toggle-active`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Service ${currentStatus ? 'deactivated' : 'activated'} successfully`, { duration: 2000 });
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
            setTogglingServiceId(null);
        }
    };

    const handleDeleteClick = (serviceId) => {
        setServiceToDelete(serviceId);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!serviceToDelete) return;

        setDeletingServiceId(serviceToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://nexus-consults.com/api/public/api/admin/services/${serviceToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Service deleted successfully', { duration: 2000 });
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
            setDeletingServiceId(null);
            setServiceToDelete(null);
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

    // Handle disciplines selection for create form
    const handleDisciplinesChange = (disciplineId, isChecked) => {
        setFormData(prev => ({
            ...prev,
            disciplines: isChecked
                ? [...prev.disciplines, disciplineId]
                : prev.disciplines.filter(id => id !== disciplineId)
        }));
    };

    // Handle disciplines selection for edit form
    const handleEditDisciplinesChange = (disciplineId, isChecked) => {
        setEditFormData(prev => ({
            ...prev,
            disciplines: isChecked
                ? [...prev.disciplines, disciplineId]
                : prev.disciplines.filter(id => id !== disciplineId)
        }));
    };

    // Dynamic sections handlers for create form
    const addSection = () => {
        const newSection = {
            id: Date.now() + Math.random(),
            content: '',
            caption: '', // ADDED: caption field
            image: null,
            existing_image: null
        };
        setFormData(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));
    };

    const removeSection = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.filter(section => section.id !== sectionId)
        }));
    };

    const updateSectionContent = (sectionId, content) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, content } : section
            )
        }));
    };

    const updateSectionCaption = (sectionId, caption) => { // ADDED: Update caption
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, caption } : section
            )
        }));
    };

    const updateSectionImage = (sectionId, image) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, image } : section
            )
        }));
    };

    const removeSectionImage = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, image: null } : section
            )
        }));
    };

    const removeExistingSectionImage = (sectionId) => {
        setFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, existing_image: null, image: null } : section
            )
        }));
    };

    // Dynamic sections handlers for edit form
    const addEditSection = () => {
        const newSection = {
            id: Date.now() + Math.random(),
            content: '',
            caption: '', // ADDED: caption field
            image: null,
            existing_image: null
        };
        setEditFormData(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));
    };

    const removeEditSection = (sectionId) => {
        setEditFormData(prev => ({
            ...prev,
            sections: prev.sections.filter(section => section.id !== sectionId)
        }));
    };

    const updateEditSectionContent = (sectionId, content) => {
        setEditFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, content } : section
            )
        }));
    };

    const updateEditSectionCaption = (sectionId, caption) => { // ADDED: Update edit caption
        setEditFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, caption } : section
            )
        }));
    };

    const updateEditSectionImage = (sectionId, image) => {
        setEditFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, image } : section
            )
        }));
    };

    const removeEditSectionImage = (sectionId) => {
        setEditFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, image: null } : section
            )
        }));
    };

    const removeExistingEditSectionImage = (sectionId) => {
        setEditFormData(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, existing_image: null, image: null } : section
            )
        }));
    };

    const resetForm = () => {
        setFormData({
            title: '',
            slug: '',
            description: '',
            is_active: true,
            cover_photo: null,
            disciplines: [],
            sections: []
        });
        setIsSlugManuallyEdited(false);
    };

    const prepareEditForm = (service) => {
        setEditingServiceId(service.id);
        // The form will be populated when serviceData is fetched
    };

    // Effect to populate edit form when service data is fetched
    useEffect(() => {
        if (serviceData && editingServiceId) {
            const sections = serviceData.sections || [];
            const formattedSections = sections.map((section, index) => ({
                id: Date.now() + index,
                content: section.content || '',
                caption: section.caption || '', // ADDED: caption from API
                image: null,
                existing_image: section.image || null
            }));

            setEditFormData({
                id: serviceData.id,
                title: serviceData.title,
                slug: serviceData.slug,
                description: serviceData.description,
                is_active: serviceData.is_active,
                cover_photo: null,
                existing_cover_photo: serviceData.cover_photo,
                disciplines: serviceData.disciplines?.map(d => d.id) || [],
                sections: formattedSections
            });
            setIsEditSlugManuallyEdited(true);
            setShowEditModal(true);
        }
    }, [serviceData, editingServiceId]);

    const handleAddService = async (e) => {
        e.preventDefault();

        // Check if at least one section has content
        const hasContent = formData.sections.some(section =>
            section.content && section.content.trim() !== ''
        );

        if (!hasContent) {
            toast.error('Please add at least one section with content');
            return;
        }

        setUpdatingService(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('slug', formData.slug);
            formDataToSend.append('is_active', formData.is_active ? 1 : 0);
            formDataToSend.append('description', formData.description);

            formData.disciplines.forEach(disciplineId => {
                formDataToSend.append('disciplines[]', disciplineId);
            });

            // Append sections
            formData.sections.forEach((section, index) => {
                formDataToSend.append(`content${index + 1}`, section.content || '');
                formDataToSend.append(`caption${index + 1}`, section.caption || ''); // ADDED: Send caption
                if (section.image instanceof File) {
                    formDataToSend.append(`image${index + 1}`, section.image);
                }
            });

            formDataToSend.append('cover_photo', formData.cover_photo || '');

            await axios.post(
                'https://nexus-consults.com/api/public/api/admin/services',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingService(false);
            toast.success('Service added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
            refetch();
            // Remove matching draft by slug if exists
            clearMatchingDraftBySlug(formData.slug);
            setActiveDraftId(null);
        } catch (error) {
            setUpdatingService(false);
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

    const handleUpdateService = async (e) => {
        e.preventDefault();

        // Check if at least one section has content
        const hasContent = editFormData.sections.some(section =>
            section.content && section.content.trim() !== ''
        );

        if (!hasContent) {
            toast.error('Please add at least one section with content');
            return;
        }

        setUpdatingService(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('title', editFormData.title);
            formDataToSend.append('slug', editFormData.slug);
            formDataToSend.append('is_active', editFormData.is_active ? 1 : 0);
            formDataToSend.append('description', editFormData.description);
            formDataToSend.append('_method', 'POST');

            editFormData.disciplines.forEach(disciplineId => {
                formDataToSend.append('disciplines[]', disciplineId);
            });

            // Append sections
            editFormData.sections.forEach((section, index) => {
                formDataToSend.append(`content${index + 1}`, section.content || '');
                formDataToSend.append(`caption${index + 1}`, section.caption || ''); // ADDED: Send caption

                // Handle image for this section
                if (section.image instanceof File) {
                    formDataToSend.append(`image${index + 1}`, section.image);
                } else if (section.existing_image === null) {
                    // If existing_image is null, it means the image was removed
                    formDataToSend.append(`image${index + 1}`, '');
                }
                // Otherwise, don't send this image field to preserve existing image
            });

            // Handle cover photo
            if (editFormData.cover_photo instanceof File) {
                formDataToSend.append('cover_photo', editFormData.cover_photo);
            } else if (editFormData.existing_cover_photo === null) {
                formDataToSend.append('cover_photo', '');
            }

            await axios.post(
                `https://nexus-consults.com/api/public/api/admin/services/${editFormData.id}`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            setUpdatingService(false);
            toast.success('Service updated successfully', { duration: 2000 });
            setShowEditModal(false);
            setEditingServiceId(null);
            refetch();
            // Invalidate the service query to refetch fresh data
            queryClient.invalidateQueries(['service', editFormData.id]);
        } catch (error) {
            setUpdatingService(false);
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

    // Filter services based on all filter criteria
    const filteredServices = services?.filter(service => {
        // Text filters
        const matchesGlobal =
            filters.global === '' ||
            service.title.toLowerCase().includes(filters.global.toLowerCase()) ||
            (service.author?.name ? service.author.name.toLowerCase().includes(filters.global.toLowerCase()) : false);

        const matchesTitle = filters.title === '' || service.title.toLowerCase().includes(filters.title.toLowerCase());
        const matchesStatus = filters.status === '' || (filters.status === 'active' ? service.is_active : !service.is_active);
        const matchesAuthor =
            filters.author === '' || (service.author?.name ? service.author.name.toLowerCase().includes(filters.author.toLowerCase()) : false);

        // Date range filter on created_at
        let matchesDate = true;
        if (service.created_at) {
            const createdDate = new Date(service.created_at);
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
    const totalPages = Math.ceil(filteredServices.length / rowsPerPage);
    const paginatedServices = filteredServices.slice(
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
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredServices.length)} of {filteredServices.length} entries
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

    // Handle individual service selection
    const handleSelectService = (serviceId, isSelected) => {
        if (isSelected) {
            setSelectedServices(prev => [...prev, serviceId]);
        } else {
            setSelectedServices(prev => prev.filter(id => id !== serviceId));
        }
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedServices(filteredServices.map(service => service.id));
            setSelectAll(true);
        } else {
            setSelectedServices([]);
            setSelectAll(false);
        }
    };

    // State for delete confirmation modal
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Bulk delete services
    const handleBulkDelete = async () => {
        if (!selectedServices.length) return;
        setShowBulkDeleteConfirm(true);
    };

    // Confirm bulk delete
    const confirmBulkDelete = async () => {
        setShowBulkDeleteConfirm(false);

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/public/api/admin/services/bulk/delete',
                { ids: selectedServices },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`${selectedServices.length} service(s) deleted successfully`);
            setSelectedServices([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error deleting services:', error);
            toast.error(error.response?.data?.message || 'Failed to delete services');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Bulk update service status
    const handleBulkStatusUpdate = async (status) => {
        if (!selectedServices.length) return;

        try {
            setIsBulkActionLoading(true);
            await axios.post('https://nexus-consults.com/api/public/api/admin/services/bulk/update-status',
                {
                    ids: selectedServices,
                    status: status
                },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success(`Status updated for ${selectedServices.length} service(s)`);
            setSelectedServices([]);
            setSelectAll(false);
            refetch();
        } catch (error) {
            console.error('Error updating service status:', error);
            toast.error(error.response?.data?.message || 'Failed to update service status');
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    // Image upload component for sections
    const SectionImageUpload = React.memo(({
        sectionId,
        label,
        existingImage,
        currentImage,
        caption,
        onImageChange,
        onRemoveImage,
        onRemoveExistingImage,
        onCaptionChange // ADDED: caption change handler
    }) => {
        const existingImageUrl = existingImage;
        const [previewUrl, setPreviewUrl] = useState(null);
        const fileInputRef = useRef(null);

        // Create preview URL for current image and clean up on unmount
        useEffect(() => {
            if (currentImage && currentImage instanceof File) {
                const url = URL.createObjectURL(currentImage);
                setPreviewUrl(url);
                return () => {
                    URL.revokeObjectURL(url);
                    setPreviewUrl(null);
                };
            } else {
                setPreviewUrl(null);
            }
        }, [currentImage]);

        const handleFileChange = (e) => {
            if (e.target.files && e.target.files[0]) {
                onImageChange(sectionId, e.target.files[0]);
            }
        };

        const handleCaptionChange = (e) => { // ADDED: caption change handler
            if (onCaptionChange) {
                onCaptionChange(sectionId, e.target.value);
            }
        };

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                {previewUrl ? (
                    <div className="relative mb-4">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-48 w-full object-cover rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => onRemoveImage(sectionId)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
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
                            onClick={() => onRemoveExistingImage(sectionId)}
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
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*"
                        />
                    </label>
                )}

                {/* ADDED: Caption input field */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image Caption</label>
                    <input
                        type="text"
                        value={caption || ''}
                        onChange={handleCaptionChange}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Enter image caption (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Add a caption for the image (optional)
                    </p>
                </div>
            </div>
        );
    }, (prevProps, nextProps) => {
        // Custom comparison to prevent unnecessary re-renders
        return (
            prevProps.sectionId === nextProps.sectionId &&
            prevProps.label === nextProps.label &&
            prevProps.existingImage === nextProps.existingImage &&
            prevProps.currentImage === nextProps.currentImage &&
            prevProps.caption === nextProps.caption
        );
    });

    // Main Image upload component (for cover photo)
    const ImageUpload = React.memo(({ name, label, existingImage, currentImage, onImageChange, onRemoveImage }) => {
        const existingImageUrl = existingImage;
        const [previewUrl, setPreviewUrl] = useState(null);

        // Create preview URL for current image and clean up on unmount
        useEffect(() => {
            if (currentImage && currentImage instanceof File) {
                const url = URL.createObjectURL(currentImage);
                setPreviewUrl(url);
                return () => {
                    URL.revokeObjectURL(url);
                    setPreviewUrl(null);
                };
            } else {
                setPreviewUrl(null);
            }
        }, [currentImage]);

        return (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                {previewUrl ? (
                    <div className="relative mb-4">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-48 w-full object-cover rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={() => onRemoveImage(name)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
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
    }, (prevProps, nextProps) => {
        // Custom comparison to prevent unnecessary re-renders
        return (
            prevProps.name === nextProps.name &&
            prevProps.label === nextProps.label &&
            prevProps.existingImage === nextProps.existingImage &&
            prevProps.currentImage === nextProps.currentImage
        );
    });

    // Render section components
    const renderCreateSections = () => {
        return formData.sections.map((section, index) => (
            <div key={section.id} className="p-4 border rounded-lg mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Section {index + 1}</h3>
                    <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        disabled={formData.sections.length === 1}
                    >
                        <FaTrash size={16} />
                    </button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content {index + 1}*
                    </label>
                    <TiptapWithImg
                        content={section.content}
                        onUpdate={(content) => updateSectionContent(section.id, content)}
                    />
                </div>
                <SectionImageUpload
                    sectionId={section.id}
                    label={`Image ${index + 1}`}
                    existingImage={section.existing_image}
                    currentImage={section.image}
                    caption={section.caption} // ADDED: pass caption
                    onImageChange={updateSectionImage}
                    onRemoveImage={removeSectionImage}
                    onRemoveExistingImage={removeExistingSectionImage}
                    onCaptionChange={updateSectionCaption} // ADDED: caption change handler
                />
            </div>
        ));
    };

    const renderEditSections = () => {
        return editFormData.sections.map((section, index) => (
            <div key={section.id} className="p-4 border rounded-lg mb-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Section {index + 1}</h3>
                    <button
                        type="button"
                        onClick={() => removeEditSection(section.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        disabled={editFormData.sections.length === 1}
                    >
                        <FaTrash size={16} />
                    </button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content {index + 1}*
                    </label>
                    <TiptapWithImg
                        content={section.content}
                        onUpdate={(content) => updateEditSectionContent(section.id, content)}
                    />
                </div>
                <SectionImageUpload
                    sectionId={section.id}
                    label={`Image ${index + 1}`}
                    existingImage={section.existing_image}
                    currentImage={section.image}
                    caption={section.caption} // ADDED: pass caption
                    onImageChange={updateEditSectionImage}
                    onRemoveImage={removeEditSectionImage}
                    onRemoveExistingImage={removeExistingEditSectionImage}
                    onCaptionChange={updateEditSectionCaption} // ADDED: caption change handler
                />
            </div>
        ));
    };

    return (
        <div className="shadow-2xl rounded-2xl overflow-hidden bg-white">
            {/* Global Search and Add Button */}
            <div className="p-4 border-b flex justify-between items-center gap-4">
                <input
                    type="text"
                    value={filters.global}
                    onChange={(e) => handleFilterChange('global', e.target.value)}
                    placeholder="Search services..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.admin?.permissions?.includes('create_services') && <button
                    onClick={() => { setShowAddModal(true); resetForm() }}
                    className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                >
                    <FaPlus size={18} />
                    <span>Add Service</span>
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
                                        checked={selectAll && filteredServices.length > 0}
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
                                        Loading services...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedServices.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-4 text-center">
                                    No services found
                                </td>
                            </tr>
                        ) : (
                            paginatedServices.map((service) => (
                                <tr key={service.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedServices.includes(service.id)}
                                                onChange={(e) => handleSelectService(service.id, e.target.checked)}
                                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                            />
                                            <span className="ml-2 text-sm font-medium text-gray-900">
                                                {service.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {service.author?.name || '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {service.cover_photo && (
                                            <img
                                                src={service.cover_photo}
                                                alt="Cover"
                                                className="h-10 w-10 object-cover rounded"
                                            />
                                        )}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {statusBadge(service.is_active)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {service.created_at ? new Date(service.created_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {currentUser?.data?.data?.admin?.permissions?.includes('edit_services') && <button
                                                className="text-blue-500 hover:text-blue-700 p-1"
                                                onClick={() => prepareEditForm(service)}
                                                disabled={isServiceLoading}
                                            >
                                                {isServiceLoading && editingServiceId === service.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    <FaEdit size={18} />
                                                )}
                                            </button>}
                                            <button
                                                className={`${!service.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'} p-1`}
                                                onClick={() => handleToggleStatus(service.id, service.is_active)}
                                                disabled={togglingServiceId === service.id}
                                            >
                                                {togglingServiceId === service.id ? (
                                                    <FaSpinner className="animate-spin" size={18} />
                                                ) : (
                                                    !service.is_active ? <FaTimes /> : <FaCheck />
                                                )}
                                            </button>
                                            {currentUser?.data?.data?.admin?.permissions?.includes('delete_services') && <button
                                                className="text-red-500 hover:text-red-700 p-1"
                                                onClick={() => handleDeleteClick(service.id)}
                                                disabled={deletingServiceId === service.id}
                                                title="Delete"
                                            >
                                                {deletingServiceId === service.id ? (
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
                            Are you sure you want to delete {selectedServices.length} selected service(s)? This action cannot be undone.
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
            {selectedServices.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-md mb-6 border border-blue-200">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="text-blue-800 font-medium">
                            {selectedServices.length} service(s) selected
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
                                    setSelectedServices([]);
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

            {/* Add Service Modal */}
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
                            <h2 className="text-xl font-bold mb-4">Add New Service</h2>
                            <form onSubmit={handleAddService}>
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
                                        placeholder="Enter service description..."
                                    />
                                </div>

                                {/* Cover Photo Upload */}
                                <ImageUpload
                                    name="cover_photo"
                                    label="Cover Photo"
                                    currentImage={formData.cover_photo}
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
                                {/* Disciplines Checkboxes */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Disciplines</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                                        {disciplinesData?.map((discipline) => (
                                            <div key={discipline.id} className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`discipline-${discipline.id}`}
                                                    checked={formData.disciplines.includes(discipline.id)}
                                                    onChange={(e) => handleDisciplinesChange(discipline.id, e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor={`discipline-${discipline.id}`} className="ml-2 text-sm text-gray-700">
                                                    {discipline.title}
                                                    {!discipline.is_active && (
                                                        <span className="ml-1 text-xs text-orange-600">(inactive)</span>
                                                    )}
                                                </label>
                                            </div>
                                        ))}
                                        {(!disciplinesData || disciplinesData.length === 0) && (
                                            <div className="text-sm text-gray-500 col-span-full">No disciplines available</div>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Sections */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-medium">Sections</h3>
                                        <button
                                            type="button"
                                            onClick={addSection}
                                            className="bg-primary hover:bg-darkBlue text-white px-3 py-2 rounded-md flex items-center gap-2"
                                        >
                                            <FaPlus /> Add Section
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {formData.sections.length === 0 ? (
                                            <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                                <p className="text-gray-500 mb-4">No sections added yet. Click "Add Section" to get started.</p>
                                                <p className="text-sm text-gray-400">Note: At least one section with content is required.</p>
                                            </div>
                                        ) : (
                                            renderCreateSections()
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <div className="text-xs text-gray-500 mt-2 flex items-center">
                                        <FaSpinner className={`animate-spin mr-1 ${updatingService ? 'opacity-100' : 'opacity-0'}`} size={12} />
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
                                        disabled={updatingService}
                                    >
                                        {updatingService ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Service</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Service Modal */}
            {showEditModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"

                >
                    <button onClick={() => {
                        setShowEditModal(false); setEditingServiceId(null)
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
                                        setEditingServiceId(null);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Services
                                </button>
                                <span className="mx-2 text-gray-400">{'>'}</span>
                                <span className="text-xl font-bold text-gray-900">
                                    {editFormData.title || 'Untitled Service'}
                                </span>
                                {isServiceLoading && (
                                    <div className="ml-4 flex items-center text-sm text-gray-500">
                                        <FaSpinner className="animate-spin mr-2" size={14} />
                                        Loading service data...
                                    </div>
                                )}
                            </div>

                            {isServiceLoading ? (
                                <div className="flex justify-center items-center py-8">
                                    <FaSpinner className="animate-spin mr-2" size={24} />
                                    <span>Loading service data...</span>
                                </div>
                            ) : (
                                <form onSubmit={handleUpdateService}>
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
                                            placeholder="Enter service description..."
                                        />
                                    </div>

                                    {/* Cover Photo Upload */}
                                    <ImageUpload
                                        name="cover_photo"
                                        label="Cover Photo"
                                        existingImage={editFormData.existing_cover_photo}
                                        currentImage={editFormData.cover_photo}
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

                                    {/* Disciplines Checkboxes for Edit */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Disciplines</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                                            {disciplinesData?.map((discipline) => (
                                                <div key={discipline.id} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`edit-discipline-${discipline.id}`}
                                                        checked={editFormData.disciplines.includes(discipline.id)}
                                                        onChange={(e) => handleEditDisciplinesChange(discipline.id, e.target.checked)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={`edit-discipline-${discipline.id}`} className="ml-2 text-sm text-gray-700">
                                                        {discipline.title}
                                                        {!discipline.is_active && (
                                                            <span className="ml-1 text-xs text-orange-600">(inactive)</span>
                                                        )}
                                                    </label>
                                                </div>
                                            ))}
                                            {(!disciplinesData || disciplinesData.length === 0) && (
                                                <div className="text-sm text-gray-500 col-span-full">No disciplines available</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Dynamic Sections for Edit */}
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-medium">Sections</h3>
                                            <button
                                                type="button"
                                                onClick={addEditSection}
                                                className="bg-primary hover:bg-darkBlue text-white px-3 py-2 rounded-md flex items-center gap-2"
                                            >
                                                <FaPlus /> Add Section
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {editFormData.sections.length === 0 ? (
                                                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                                    <p className="text-gray-500 mb-4">No sections added yet. Click "Add Section" to get started.</p>
                                                    <p className="text-sm text-gray-400">Note: At least one section with content is required.</p>
                                                </div>
                                            ) : (
                                                renderEditSections()
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEditModal(false);
                                                setEditingServiceId(null);
                                            }}
                                            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-darkBlue transition-all flex items-center justify-center gap-2"
                                            disabled={updatingService}
                                        >
                                            {updatingService ? (
                                                <>
                                                    <FaSpinner className="animate-spin" size={18} />
                                                    <span>Updating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FaCheck size={18} />
                                                    <span>Update Service</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Service</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this service? This action cannot be undone.
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