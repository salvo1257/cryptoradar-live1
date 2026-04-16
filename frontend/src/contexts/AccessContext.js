import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AccessContext = createContext(null);

// Storage key for admin token
const ADMIN_TOKEN_KEY = 'cryptoradar_admin_token';

export function AccessProvider({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [loginError, setLoginError] = useState(null);

  // Check for existing admin token on mount
  useEffect(() => {
    const checkExistingToken = async () => {
      const savedToken = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (savedToken) {
        try {
          const response = await axios.get(`${API_URL}/auth/verify-admin`, {
            headers: { 'X-Admin-Key': savedToken }
          });
          setIsAdmin(response.data.is_admin);
        } catch (error) {
          // Token invalid, remove it
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          setIsAdmin(false);
        }
      }
      setIsVerifying(false);
    };

    checkExistingToken();
  }, []);

  // Login function
  const adminLogin = useCallback(async (secretKey) => {
    setLoginError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/admin-login`, {
        secret_key: secretKey
      });
      
      if (response.data.success) {
        localStorage.setItem(ADMIN_TOKEN_KEY, response.data.token);
        setIsAdmin(true);
        return { success: true };
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Login failed';
      setLoginError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  // Logout function
  const adminLogout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAdmin(false);
  }, []);

  // Get admin headers for API calls
  const getAdminHeaders = useCallback(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    return token ? { 'X-Admin-Key': token } : {};
  }, []);

  // Make authenticated API call
  const adminApiCall = useCallback(async (method, endpoint, data = null) => {
    const headers = getAdminHeaders();
    try {
      const config = { headers };
      if (method === 'get') {
        return await axios.get(`${API_URL}${endpoint}`, config);
      } else if (method === 'post') {
        return await axios.post(`${API_URL}${endpoint}`, data, config);
      } else if (method === 'put') {
        return await axios.put(`${API_URL}${endpoint}`, data, config);
      } else if (method === 'delete') {
        return await axios.delete(`${API_URL}${endpoint}`, config);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        // Admin access revoked or invalid
        adminLogout();
      }
      throw error;
    }
  }, [getAdminHeaders, adminLogout]);

  const value = {
    isAdmin,
    isVerifying,
    loginError,
    adminLogin,
    adminLogout,
    getAdminHeaders,
    adminApiCall
  };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
}
