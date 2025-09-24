import React from 'react'
import { Link } from 'react-router-dom'

export default function Webinars() {
    return (
        <div className=" mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-10">Webinars</h1>

            <div className="space-y-6">
                <div className="group">
                    <Link
                        to={'events'}
                        className='block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group-hover:border-primary border-l-4 border-transparent'
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Events</h2>
                        <p className="text-gray-600">Browse Webinars upcomming events</p>
                    </Link>
                </div>

                <div className="group">
                    <Link
                        to={'videos'}
                        className='block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group-hover:border-primary border-l-4 border-transparent'
                    >
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Videos</h2>
                        <p className="text-gray-600">Browse Webinars Videos</p>
                    </Link>
                </div>
            </div>
        </div>
    )
}