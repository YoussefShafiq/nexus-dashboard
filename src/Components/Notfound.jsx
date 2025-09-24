import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { useNavigate } from 'react-router-dom'

<Helmet>
    <title>Page Not Found | Sehtnaa</title>
    <meta name="robots" content="noindex" />
    <meta name="description" content="The page you're looking for doesn't exist." />
</Helmet>
export default function Notfound() {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/');
        // window.__STATUS__ = 404;

    }, []);
    return <>

    </>
}
