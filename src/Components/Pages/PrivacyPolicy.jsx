// src/pages/PrivacyAndTerms.jsx
import React, { useEffect, useState } from 'react';
import Tiptap from '../TextEditor/Tiptap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

export default function PrivacyPolicy() {
    const [editorContent, setEditorContent] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate()

    const { data: currentUser, isLoading: isCurrentuserLoading } = useQuery({
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

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post('https://api.nexus.com/api/admin/legal-documents/privacy-policy', {
                content: editorContent
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('userToken')}`
                }
            });
            toast.success('Privacy Policy saved successfully');

        } catch (error) {
            toast.error(error.response?.data?.message || 'An unexpected error occurred', { duration: 3000 });
        } finally {
            setIsSaving(false);
        }
    };

    const { data, isLoading, refetch, error, isError } = useQuery({
        queryKey: ['privacy-policy'],
        queryFn: () => {
            return axios.get('https://api.nexus.com/api/legal-documents/privacy-policy')
        }
    })

    useEffect(() => {
        if (isError) {
            if (error.response?.status == 401) {
                localStorage.removeItem('userToken')
                navigate('/login')
            }
            if (error.response?.status == 403) {
                toast.error('You are not authorized to view this page')
                navigate('/home')
            }
        }
    }, [isError])

    useEffect(() => {
        if (data?.data?.data?.content) {
            setEditorContent(data?.data?.data?.content)
        }
    }, [data?.data?.data])

    return (
        <div className="p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Privacy Policy</h1>

            <div className="border border-gray-200 rounded-lg shadow-sm p-6 bg-white">
                {editorContent &&
                    <Tiptap
                        key={data?.data?.data?.content}
                        content={editorContent}
                        onUpdate={setEditorContent}
                    />}

                <div className="flex gap-4 mt-6">
                    {currentUser?.data?.data?.permissions?.includes('update_privacy_policy') && <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-6 py-2 rounded-md font-medium text-white ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors`}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>}
                </div>
            </div>
        </div>
    );
}