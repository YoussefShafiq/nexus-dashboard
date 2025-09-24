import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Notfound() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/');

  }, []);
  return null
}
