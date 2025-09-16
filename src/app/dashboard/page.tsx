'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthWrapper';
import { BlockForm } from '@/components/BlockForm';
import { BlockList } from '@/components/BlockList';
import { Navigation } from '@/components/Navigation';

interface StudyBlock {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  reminderSent: boolean;
  createdAt: string;
}

export default function DashboardPage() {
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StudyBlock | null>(null);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Fetch blocks
  const fetchBlocks = async () => {
    // Don't fetch if user is null or auth is loading
    if (!user || authLoading) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/blocks');
      
      // Handle authentication errors gracefully
      if (response.status === 401) {
        console.log('User not authenticated, redirecting to auth');
        router.push('/auth');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch blocks');
      }
      const data = await response.json();
      setBlocks(data.blocks || []);
    } catch (err) {
      // Only set error if we have a user (avoid errors during signout)
      if (user) {
        setError(err instanceof Error ? err.message : 'Failed to fetch blocks');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch blocks if user exists and auth is not loading
    if (user && !authLoading) {
      fetchBlocks();
    } else if (!user) {
      // Clear blocks when user is signed out
      setBlocks([]);
      setError('');
    }
  }, [user, authLoading]);

  // Create or update block
  const handleSubmit = async (formData: { title: string; startTime: string; endTime: string }) => {
    // Check if user is authenticated
    if (!user || authLoading) {
      throw new Error('User not authenticated');
    }
    
    try {
      const url = editingBlock ? `/api/blocks/${editingBlock._id}` : '/api/blocks';
      const method = editingBlock ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        throw new Error('Session expired. Please sign in again.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save block');
      }

      await fetchBlocks();
      setShowForm(false);
      setEditingBlock(null);
    } catch (err) {
      throw err; 
    }
  };

  // Delete block
  const handleDelete = async (blockId: string) => {
    // Check if user is authenticated
    if (!user || authLoading) {
      alert('User not authenticated');
      return;
    }
    
    try {
      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        alert('Session expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to delete block');
      }

      await fetchBlocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete block');
    }
  };

  // Edit block
  const handleEdit = (block: StudyBlock) => {
    setEditingBlock(block);
    setShowForm(true);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if no user
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <Navigation />
      
      {/* Main Content */}
      <div className="pt-4 px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                My Study Blocks
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Schedule and manage your focused study sessions
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
            >
              <span className="sm:hidden">+ Add Study Block</span>
              <span className="hidden sm:inline">+ Add Study Block</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Welcome message for first-time users */}
          {!loading && blocks.length === 0 && !showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 mb-6">
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📚</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">
                  Welcome to your Quiet Hours Scheduler!
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Get started by creating your first study block. Set up focused study periods and receive 
                  email reminders to help you stay on track.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Create Your First Study Block
                </button>
              </div>
            </div>
          )}

          {/* Blocks List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <BlockList
              blocks={blocks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingBlock ? 'Edit Study Block' : 'Create New Study Block'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingBlock(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <BlockForm
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingBlock(null);
                }}
                initialData={editingBlock || undefined}
                isEditing={!!editingBlock}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}