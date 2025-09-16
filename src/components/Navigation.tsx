'use client';

import React, { useState } from 'react';
import { useAuth } from './AuthWrapper';

export function Navigation() {
  const { user, signOut, loading } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (loading) {
    return null; // Don't show navigation while loading
  }

  if (!user) {
    return null; // Don't show navigation for unauthenticated users
  }

  const handleSignOut = async () => {
    if (signingOut) return; // Prevent multiple clicks
    
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      // Show user-friendly error message
      alert('Failed to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔕</span>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-black  900">
                Quiet Hours Scheduler
              </h1>
            </div>
          </div>

          {/* User info and logout */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* User avatar/icon */}
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* User info */}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-black  900">
                  {user.user_metadata?.name || user.email?.split('@')[0]}
                </span>
                <span className="text-xs text-black  500">
                  {user.email}
                </span>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-xs text-black  600">Online</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md transition-colors duration-200 ${
                signingOut
                  ? 'text-gray-500 bg-gray-100 cursor-not-allowed opacity-50'
                  : 'text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
              }`}
            >
              {signingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-1"></div>
                  Signing Out...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}