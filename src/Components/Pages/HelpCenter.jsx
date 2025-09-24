import React from 'react'
import { Link } from 'react-router-dom'

export default function HelpCenter() {
    return (
        <div className=" mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-10">Help Center</h1>

            <div className="space-y-6">
                <div className="group">
                    <Link
                        to={'categories'}
                        className='block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group-hover:border-primary border-l-4 border-transparent'
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Categories</h2>
                        <p className="text-gray-600">Browse help topics by category</p>
                    </Link>
                </div>

                <div className="group">
                    <Link
                        to={'subcategories'}
                        className='block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group-hover:border-primary border-l-4 border-transparent'
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Subcategories</h2>
                        <p className="text-gray-600">Find more specific help topics</p>
                    </Link>
                </div>

                <div className="group">
                    <Link
                        to={'articles'}
                        className='block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group-hover:border-primary border-l-4 border-transparent'
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Articles</h2>
                        <p className="text-gray-600">Read detailed help articles</p>
                    </Link>
                </div>
            </div>
        </div>
    )
}