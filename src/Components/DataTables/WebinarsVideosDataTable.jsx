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
    FaYoutube,
    FaFileUpload,
    FaPlay
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

export default function WebinarsVideosDataTable({ WebinarsVideosData, loading, refetch }) {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        global: '',
        title: '',
        type: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [deletingVideoSlug, setDeletingVideoSlug] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [videoToDelete, setVideoToDelete] = useState(null);
    const [updatingVideo, setUpdatingVideo] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [coverPhotoPreview, setCoverPhotoPreview] = useState(null);
    const [videoFile, setVideoFile] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        title: '',
        type: 'youtube',
        video_url: '',
        cover_photo: null
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

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setCurrentPage(1);
    };

    const handleDeleteClick = (videoSlug) => {
        setVideoToDelete(videoSlug);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!videoToDelete) return;

        setDeletingVideoSlug(videoToDelete);
        setShowDeleteConfirm(false);

        try {
            await axios.delete(
                `https://api.nexus.com/api/admin/webinars/videos/${videoToDelete}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('userToken')}`
                    }
                }
            );
            toast.success('Video deleted successfully', { duration: 2000 });
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
            setDeletingVideoSlug(null);
            setVideoToDelete(null);
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                cover_photo: file
            }));

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleVideoFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
            setFormData(prev => ({
                ...prev,
                video_url: file
            }));
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            type: 'youtube',
            video_url: '',
            cover_photo: null
        });
        setCoverPhotoPreview(null);
        setVideoFile(null);
    };

    const prepareEditForm = (video) => {
        setSelectedVideo(video);
        setFormData({
            title: video.title,
            type: video.type,
            video_url: video.video_url,
            cover_photo: null
        });
        setCoverPhotoPreview(video.cover_photo ? `${video.cover_photo}` : null);
        setShowEditModal(true);
    };

    const handleAddVideo = async (e) => {
        e.preventDefault();
        setUpdatingVideo(true);

        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('type', formData.type);

        if (formData.type === 'youtube') {
            formDataToSend.append('video_url', formData.video_url);
        } else {
            formDataToSend.append('video_url', formData.video_url);
        }

        if (formData.cover_photo) {
            formDataToSend.append('cover_photo', formData.cover_photo);
        }

        try {
            await axios.post(
                'https://api.nexus.com/api/admin/webinars/videos',
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            toast.success('Video added successfully', { duration: 2000 });
            setShowAddModal(false);
            resetForm();
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
            setUpdatingVideo(false);
        }
    };

    const handleUpdateVideo = async (e) => {
        e.preventDefault();
        setUpdatingVideo(true);

        const formDataToSend = new FormData();
        formDataToSend.append('title', formData.title);
        formDataToSend.append('type', formData.type);

        if (formData.type === 'youtube') {
            formDataToSend.append('video_url', formData.video_url);
        } else if (videoFile) {
            formDataToSend.append('video_url', videoFile);
        }

        if (formData.cover_photo) {
            formDataToSend.append('cover_photo', formData.cover_photo);
        }

        // Add _method: PUT for Laravel to recognize as PUT request

        try {
            await axios.post(
                `https://api.nexus.com/api/admin/webinars/videos/${selectedVideo.slug}`,
                formDataToSend,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            toast.success('Video updated successfully', { duration: 2000 });
            setShowEditModal(false);
            resetForm();
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
            setUpdatingVideo(false);
        }
    };

    // Filter videos based on all filter criteria
    const filteredVideos = WebinarsVideosData?.filter(video => {
        return (
            (filters.global === '' ||
                video.title.toLowerCase().includes(filters.global.toLowerCase())) &&
            (filters.title === '' ||
                video.title.toLowerCase().includes(filters.title.toLowerCase())) &&
            (filters.type === '' ||
                video.type.toLowerCase().includes(filters.type.toLowerCase()))
        );
    }) || [];

    // Pagination logic
    const totalPages = Math.ceil(filteredVideos.length / rowsPerPage);
    const paginatedVideos = filteredVideos.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <div className="flex justify-between items-center mt-4 px-4 pb-1">
                <div className='text-xs'>
                    Showing {((currentPage - 1) * rowsPerPage + 1)}-{Math.min(currentPage * rowsPerPage, filteredVideos.length)} of {filteredVideos.length} entries
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

    const getVideoTypeIcon = (type) => {
        return type === 'youtube' ? (
            <FaYoutube className="text-red-500" />
        ) : (
            <FaFileUpload className="text-blue-500" />
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
                    placeholder="Search videos..."
                    className="px-3 py-2 rounded-xl shadow-sm focus:outline-2 focus:outline-primary w-full border border-primary transition-all"
                />
                {currentUser?.data?.data?.permissions?.includes('manage_webinars') && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-primary hover:bg-darkBlue transition-all text-white px-3 py-2 rounded-xl shadow-sm min-w-max flex items-center gap-2"
                    >
                        <FaPlus size={18} />
                        <span>Add Video</span>
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
                                Type
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created At
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
                                        Loading videos...
                                    </div>
                                </td>
                            </tr>
                        ) : paginatedVideos.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-3 py-4 text-center">
                                    No videos found
                                </td>
                            </tr>
                        ) : (
                            paginatedVideos.map((video) => (
                                <tr key={video.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="font-medium">{video.title}</div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getVideoTypeIcon(video.type)}
                                            {video.type === 'youtube' ? 'YouTube' : 'Uploaded Video'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        {formatDate(video.created_at)}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={video.type === 'youtube' ? video.video_url : `${video.video_url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-green-500 hover:text-green-700 p-1"
                                            >
                                                <FaPlay size={18} />
                                            </a>
                                            {currentUser?.data?.data?.permissions?.includes('manage_webinars') && (
                                                <button
                                                    className="text-blue-500 hover:text-blue-700 p-1"
                                                    onClick={() => prepareEditForm(video)}
                                                >
                                                    <FaEdit size={18} />
                                                </button>
                                            )}
                                            {currentUser?.data?.data?.permissions?.includes('manage_webinars') && (
                                                <button
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    onClick={() => handleDeleteClick(video.slug)}
                                                    disabled={deletingVideoSlug === video.slug}
                                                >
                                                    {deletingVideoSlug === video.slug ? (
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

            {/* Add Video Modal */}
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
                            <h2 className="text-xl font-bold mb-4">Add New Webinar Video</h2>
                            <form onSubmit={handleAddVideo}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                                    <input
                                        required
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type*</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        <option value="youtube">YouTube</option>
                                        <option value="upload">Upload Video</option>
                                    </select>
                                </div>

                                {formData.type === 'youtube' ? (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL*</label>
                                        <input
                                            required
                                            type="url"
                                            name="video_url"
                                            value={formData.video_url}
                                            onChange={handleFormChange}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Video File*</label>
                                        <input
                                            required
                                            type="file"
                                            name="video_url"
                                            onChange={handleVideoFileChange}
                                            accept="video/*"
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                        {videoFile && (
                                            <p className="text-xs text-gray-500 mt-1">{videoFile.name}</p>
                                        )}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
                                    <input
                                        type="file"
                                        name="cover_photo"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                    {coverPhotoPreview && (
                                        <div className="mt-2">
                                            <img src={coverPhotoPreview} alt="Cover preview" className="h-32 object-contain" />
                                        </div>
                                    )}
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
                                        disabled={updatingVideo}
                                    >
                                        {updatingVideo ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Adding...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaPlus size={18} />
                                                <span>Add Video</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Edit Video Modal */}
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
                            <h2 className="text-xl font-bold mb-4">Edit Webinar Video</h2>
                            <form onSubmit={handleUpdateVideo}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title*</label>
                                    <input
                                        required
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type*</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    >
                                        <option value="youtube">YouTube</option>
                                        <option value="upload">Upload Video</option>
                                    </select>
                                </div>

                                {formData.type === 'youtube' ? (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL*</label>
                                        <input
                                            required
                                            type="url"
                                            name="video_url"
                                            value={formData.video_url}
                                            onChange={handleFormChange}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Video File*</label>
                                        <input
                                            type="file"
                                            name="video_url"
                                            onChange={handleVideoFileChange}
                                            accept="video/*"
                                            className="w-full px-3 py-2 border rounded-md"
                                        />
                                        {!videoFile && (
                                            <p className="text-xs text-gray-500 mt-1">Current video: {selectedVideo.video_url.split('/').pop()}</p>
                                        )}
                                        {videoFile && (
                                            <p className="text-xs text-gray-500 mt-1">New file: {videoFile.name}</p>
                                        )}
                                    </div>
                                )}

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Photo</label>
                                    <input
                                        type="file"
                                        name="cover_photo"
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                    {coverPhotoPreview && (
                                        <div className="mt-2">
                                            <img src={coverPhotoPreview} alt="Cover preview" className="h-32 object-contain" />
                                            <p className="text-xs text-gray-500 mt-1">Current cover photo</p>
                                        </div>
                                    )}
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
                                        disabled={updatingVideo}
                                    >
                                        {updatingVideo ? (
                                            <>
                                                <FaSpinner className="animate-spin" size={18} />
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaEdit size={18} />
                                                <span>Update Video</span>
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
                                    <h3 className="text-lg font-medium text-gray-900">Delete Webinar Video</h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this video? This action cannot be undone.
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