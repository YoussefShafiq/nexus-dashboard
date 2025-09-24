import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';

export default function UserSetting() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [pendingFormData, setPendingFormData] = useState(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors }
    } = useForm();

    // Fetch current user data
    const { data: currentUser, isLoading: isCurrentUserLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: () => {
            return axios.get('https://api.propxpro.com/api/auth/me', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            });
        }
    });

    // Populate form with current user data when entering edit mode
    useEffect(() => {
        if (isEditing && currentUser?.data?.data?.user) {
            setValue('name', currentUser.data.data.user.name);
            setValue('email', currentUser.data.data.user.email);
            setValue('bio', currentUser.data.data.user.bio || ''); // Set bio value, default to empty string if not exists
        }
    }, [isEditing, currentUser, setValue]);

    // Send verification code mutation
    const sendVerificationMutation = useMutation({
        mutationFn: async () => {
            return axios.post('https://api.propxpro.com/api/admin/settings/request-update', {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });
        },
        onSuccess: () => {
            toast.success('Verification code sent to your email');
            setShowVerificationModal(true);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to send verification code');
        }
    });

    // Update user mutation
    const updateUserMutation = useMutation({
        mutationFn: async ({ formData, verificationCode }) => {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('bio', formData.bio); // Add bio to form data
            data.append('code', verificationCode);

            if (formData.password) {
                data.append('password', formData.password);
            }
            if (selectedFile) {
                data.append('profile_image', selectedFile);
            }

            return axios.post('https://api.propxpro.com/api/admin/settings/confirm-update', data, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
        },
        onSuccess: () => {
            toast.success('Profile updated successfully');
            queryClient.invalidateQueries(['currentUser']);
            setIsEditing(false);
            setSelectedFile(null);
            setPreviewImage(null);
            setShowVerificationModal(false);
            setVerificationCode('');
            setPendingFormData(null);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        }
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = (data) => {
        setPendingFormData(data);
        sendVerificationMutation.mutate();
    };

    const handleVerificationSubmit = () => {
        if (!verificationCode.trim()) {
            toast.error('Please enter verification code');
            return;
        }

        updateUserMutation.mutate({
            formData: pendingFormData,
            verificationCode: verificationCode.trim()
        });
    };

    const closeVerificationModal = () => {
        setShowVerificationModal(false);
        setVerificationCode('');
        setPendingFormData(null);
    };

    // Enhanced loading state with spinner
    if (isCurrentUserLoading) {
        return (
            <div className="mx-auto p-6">
                {/* Header Skeleton */}
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-8 animate-pulse"></div>

                <div className="flex flex-col gap-8">
                    {/* Profile Card Skeleton */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex items-center mb-8">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse"></div>
                            </div>
                            <div className="ml-6 space-y-2">
                                <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                                <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                            </div>
                        </div>

                        {/* Form Fields Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map((item) => (
                                <div key={item}>
                                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-1 animate-pulse"></div>
                                    <div className="h-10 bg-gray-100 rounded-md animate-pulse"></div>
                                </div>
                            ))}

                            {/* Bio Field Skeleton */}
                            <div className="md:col-span-2">
                                <div className="h-4 bg-gray-200 rounded w-1/6 mb-1 animate-pulse"></div>
                                <div className="h-20 bg-gray-100 rounded-md animate-pulse"></div>
                            </div>
                        </div>

                        {/* Button Skeleton */}
                        <div className="mt-8 flex justify-end">
                            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
                        </div>
                    </div>

                    {/* Permissions Card Skeleton */}
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6 animate-pulse"></div>
                        <div className="flex flex-wrap gap-3">
                            {[1, 2, 3, 4, 5].map((item) => (
                                <div key={item} className="h-8 bg-gray-100 rounded-xl w-24 animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Welcome {currentUser?.data?.data?.user?.name.split(' ')[0]}</h1>

            <div className="flex flex-col gap-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center mb-8">
                        <div className="relative">
                            <img
                                src={previewImage || (currentUser?.data?.data?.user?.profile_image)}
                                alt="Profile"
                                className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                            />
                            {isEditing && (
                                <label className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-2 cursor-pointer">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    </svg>
                                </label>
                            )}
                        </div>
                        <div className="ml-6">
                            <h2 className="text-xl font-semibold">{currentUser?.data?.data?.user?.name}</h2>
                            <p className="text-gray-600">{currentUser?.data?.data?.user?.email}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Member since: {new Date(currentUser?.data?.data?.user?.created_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        {...register('name', { required: 'Name is required' })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={sendVerificationMutation.isPending}
                                    />
                                ) : (
                                    <p className="px-3 py-2 bg-gray-50 rounded-md">{currentUser?.data?.data?.user?.name}</p>
                                )}
                                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        {...register('email', {
                                            required: 'Email is required',
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: 'Invalid email address'
                                            }
                                        })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="px-3 py-2 bg-gray-50 rounded-md">{currentUser?.data?.data?.user?.email}</p>
                                )}
                                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
                            </div>

                            {/* Bio Field */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                {isEditing ? (
                                    <textarea
                                        {...register('bio')}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Tell us about yourself..."
                                        disabled={sendVerificationMutation.isPending}
                                    />
                                ) : (
                                    <p className="px-3 py-2 bg-gray-50 rounded-md whitespace-pre-line">
                                        {currentUser?.data?.data?.user?.bio || 'No bio yet'}
                                    </p>
                                )}
                            </div>

                            {isEditing && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            {...register('password')}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Leave blank to keep current password"
                                            disabled={sendVerificationMutation.isPending}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                        <input
                                            type="password"
                                            {...register('confirmPassword', {
                                                validate: value => {
                                                    const password = watch('password');
                                                    if (!password && !value) return true; // Both empty is OK
                                                    return value === password || 'Passwords do not match';
                                                }
                                            })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Confirm new password"
                                            disabled={sendVerificationMutation.isPending}
                                        />
                                        {errors.confirmPassword && (
                                            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-8 flex justify-end space-x-3">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            reset();
                                            setSelectedFile(null);
                                            setPreviewImage(null);
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                        disabled={sendVerificationMutation.isPending}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={sendVerificationMutation.isPending}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {sendVerificationMutation.isPending && (
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        )}
                                        {sendVerificationMutation.isPending ? 'Sending Code...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6">Permissions</h2>
                    <div className="flex flex-wrap gap-3">
                        {currentUser?.data?.data?.permissions?.map((p, i) => (
                            <div key={i} className="bg-gray-100 shadow p-1 rounded-xl">{p.replaceAll('_', ' ')}</div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Verification Modal */}
            {showVerificationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">

                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Email Verification</h3>
                            <button
                                onClick={closeVerificationModal}
                                className="text-gray-500 hover:text-gray-700"
                                disabled={updateUserMutation.isPending}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-gray-600 mb-4">
                            We've sent a verification code to your email address. Please enter it below to confirm your profile changes.
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Verification Code
                            </label>
                            <input
                                type="text"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter 6-digit code"
                                maxLength={6}
                                disabled={updateUserMutation.isPending}
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={closeVerificationModal}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                disabled={updateUserMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerificationSubmit}
                                disabled={updateUserMutation.isPending || !verificationCode.trim()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {updateUserMutation.isPending && (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {updateUserMutation.isPending ? 'Updating...' : 'Verify & Update'}
                            </button>
                        </div>

                        <div className="mt-4 text-center">
                            <button
                                onClick={() => sendVerificationMutation.mutate()}
                                disabled={sendVerificationMutation.isPending || updateUserMutation.isPending}
                                className="text-blue-500 hover:text-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                            >
                                {sendVerificationMutation.isPending && (
                                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {sendVerificationMutation.isPending ? 'Sending...' : 'Resend Code'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}