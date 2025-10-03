import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
    FaSpinner,
    FaEdit,
    FaSave,
    FaTimes,
    FaImage,
    FaEye,
    FaBuilding,
    FaRocket,
    FaCalendarAlt,
    FaProjectDiagram,
    FaUsers,
    FaUserCog
} from 'react-icons/fa';

export default function AboutUs() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState('');

    const { data: currentUser, isLoading: isCurrentUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/admin/auth/profile', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            });
        }
    });

    // Form state
    const [formData, setFormData] = useState({
        our_mission: '',
        our_vision: '',
        years: '',
        projects: '',
        clients: '',
        engineers: '',
        image: null
    });

    // File input ref
    const fileInputRef = React.useRef(null);

    // Fetch about us data
    const { data: aboutusData, isLoading, isError, error } = useQuery({
        queryKey: ['aboutUs'],
        queryFn: () => {
            return axios.get('https://nexus-consults.com/api/admin/settings', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            });
        },
        refetchOnWindowFocus: false
    });

    // Set form data when data is loaded
    useEffect(() => {
        if (aboutusData?.data?.data) {
            const data = aboutusData.data.data;
            setFormData({
                our_mission: data.our_mission || '',
                our_vision: data.our_vision || '',
                years: data.years || '',
                projects: data.projects || '',
                clients: data.clients || '',
                engineers: data.engineers || '',
                image: null
            });
            if (data.image) {
                setImagePreview(data.image);
            }
        }
    }, [aboutusData]);

    useEffect(() => {
        if (isError) {
            if (error.response?.status === 401) {
                localStorage.removeItem('userToken');
                navigate('/login');
            }
            if (error.response?.status === 403) {
                toast.error('You are not authorized to view this page');
                navigate('/home');
            }
        }
    }, [isError, error, navigate]);

    // Handle image change
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }

            // Validate file size (6MB)
            if (file.size > 6 * 1024 * 1024) {
                toast.error('Image size should be less than 6MB');
                return;
            }

            setFormData(prev => ({
                ...prev,
                image: file
            }));
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({
            ...prev,
            image: null
        }));
        setImagePreview('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Update mutation
    const updateAboutUsMutation = useMutation({
        mutationFn: (formData) => {
            const data = new FormData();
            data.append('our_mission', formData.our_mission);
            data.append('our_vision', formData.our_vision);
            data.append('years', formData.years);
            data.append('projects', formData.projects);
            data.append('clients', formData.clients);
            data.append('engineers', formData.engineers);
            if (formData.image) {
                data.append('image', formData.image);
            }
            data.append('_method', 'PUT');

            return axios.post(
                'https://nexus-consults.com/api/admin/settings',
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
            toast.success('About Us information updated successfully');
            setIsEditing(false);
            queryClient.invalidateQueries(['aboutUs']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update About Us information');
            if (error.response?.status === 401) {
                localStorage.removeItem('userToken');
                navigate('/login');
            }
            if (error.response?.status === 403) {
                toast.error('You are not authorized to perform this action');
            }
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.our_mission || !formData.our_vision) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Validate numbers
        if (!formData.years || !formData.projects || !formData.clients || !formData.engineers) {
            toast.error('Please fill in all statistics fields');
            return;
        }

        updateAboutUsMutation.mutate(formData);
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset form data to original values
        if (aboutusData?.data?.data) {
            const data = aboutusData.data.data;
            setFormData({
                our_mission: data.our_mission || '',
                our_vision: data.our_vision || '',
                years: data.years || '',
                projects: data.projects || '',
                clients: data.clients || '',
                engineers: data.engineers || '',
                image: null
            });
            setImagePreview(data.image || '');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <FaSpinner className="animate-spin text-2xl text-primary" />
                    <span className="text-lg">Loading About Us information...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">About Us</h1>
                    <p className="text-gray-600 mt-2">Manage your company's about us information and statistics</p>
                </div>

                {/* Content Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-2xl overflow-hidden"
                >
                    {/* Header with Edit Button */}
                    <div className="border-b border-gray-200 px-6 py-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">About Us Information</h2>
                            {!isEditing ? (

                                currentUser?.data?.data?.admin?.permissions?.includes('edit_feedbacks') && <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-darkBlue transition-all"
                                >
                                    <FaEdit size={16} />
                                    Edit Information
                                </button>

                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                                    >
                                        <FaTimes size={16} />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={updateAboutUsMutation.isPending}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                                    >
                                        {updateAboutUsMutation.isPending ? (
                                            <FaSpinner className="animate-spin" size={16} />
                                        ) : (
                                            <FaSave size={16} />
                                        )}
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Content */}
                    <div className="p-6">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column - Image and Statistics */}
                                <div className="space-y-6">
                                    {/* Image Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            Company Image
                                        </label>
                                        <div className="flex flex-col items-center gap-4">
                                            {imagePreview ? (
                                                <div className="relative">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Company"
                                                        className="h-64 w-full object-cover rounded-lg border-2 border-gray-300"
                                                    />
                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={handleRemoveImage}
                                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all"
                                                        >
                                                            <FaTimes size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-64 w-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-3">
                                                    <FaImage className="text-gray-400 text-4xl" />
                                                    <span className="text-gray-500">No image uploaded</span>
                                                </div>
                                            )}

                                            {isEditing && (
                                                <div className="w-full">
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
                                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                                                    >
                                                        Choose Image
                                                    </button>
                                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                                        PNG, JPG, JPEG up to 5MB
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Statistics */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                            <FaBuilding className="text-primary" />
                                            Company Statistics
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Years in Business */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Years in Business
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={formData.years}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, years: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-primary"
                                                        min="0"
                                                        required
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                                        <FaCalendarAlt className="text-blue-600" />
                                                        <span className="font-semibold">{aboutusData?.data?.data?.years || '0'}</span>
                                                        <span className="text-sm text-gray-600">Years</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Projects Completed */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Projects Completed
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={formData.projects}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, projects: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-primary"
                                                        min="0"
                                                        required
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                                        <FaProjectDiagram className="text-green-600" />
                                                        <span className="font-semibold">{aboutusData?.data?.data?.projects || '0'}</span>
                                                        <span className="text-sm text-gray-600">Projects</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Happy Clients */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Happy Clients
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={formData.clients}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, clients: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-primary"
                                                        min="0"
                                                        required
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                                                        <FaUsers className="text-purple-600" />
                                                        <span className="font-semibold">{aboutusData?.data?.data?.clients || '0'}</span>
                                                        <span className="text-sm text-gray-600">Clients</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Engineers */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Expert Engineers
                                                </label>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={formData.engineers}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, engineers: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-primary"
                                                        min="0"
                                                        required
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                                                        <FaUserCog className="text-orange-600" />
                                                        <span className="font-semibold">{aboutusData?.data?.data?.engineers || '0'}</span>
                                                        <span className="text-sm text-gray-600">Engineers</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Mission and Vision */}
                                <div className="space-y-6">
                                    {/* Our Mission */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                            <FaRocket className="text-primary" />
                                            Our Mission *
                                        </label>
                                        {isEditing ? (
                                            <textarea
                                                value={formData.our_mission}
                                                onChange={(e) => setFormData(prev => ({ ...prev, our_mission: e.target.value }))}
                                                rows={6}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-primary resize-vertical"
                                                placeholder="Describe your company's mission..."
                                                required
                                            />
                                        ) : (
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <p className="text-gray-700 whitespace-pre-wrap">
                                                    {aboutusData?.data?.data?.our_mission || 'No mission statement provided.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Our Vision */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                            <FaEye className="text-primary" />
                                            Our Vision *
                                        </label>
                                        {isEditing ? (
                                            <textarea
                                                value={formData.our_vision}
                                                onChange={(e) => setFormData(prev => ({ ...prev, our_vision: e.target.value }))}
                                                rows={6}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-primary resize-vertical"
                                                placeholder="Describe your company's vision..."
                                                required
                                            />
                                        ) : (
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                <p className="text-gray-700 whitespace-pre-wrap">
                                                    {aboutusData?.data?.data?.our_vision || 'No vision statement provided.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preview Mode Notice */}
                            {!isEditing && (
                                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FaEye className="text-blue-600" />
                                        <div>
                                            <p className="text-sm text-blue-800">
                                                You are currently in preview mode. Click "Edit Information" to make changes.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </motion.div>

                {/* Loading Overlay */}
                {updateAboutUsMutation.isPending && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-3">
                            <FaSpinner className="animate-spin text-primary text-xl" />
                            <span className="text-gray-700">Updating About Us information...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}