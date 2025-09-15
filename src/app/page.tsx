'use client';

import { useState, useEffect } from 'react';
import { AuthWrapper, useAuth } from '@/components/AuthWrapper';
import { BlockForm } from '@/components/BlockForm';
import { BlockList } from '@/components/BlockList';

interface StudyBlock {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  reminderSent: boolean;
  createdAt: string;
}

function Dashboard() {
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<StudyBlock | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  // Fetch blocks
  const fetchBlocks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blocks');
      if (!response.ok) {
        throw new Error('Failed to fetch blocks');
      }
      const data = await response.json();
      setBlocks(data.blocks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch blocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBlocks();
    }
  }, [user]);

  // Create or update block
  const handleSubmit = async (formData: { title: string; startTime: string; endTime: string }) => {
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
    try {
      const response = await fetch(`/api/blocks/${blockId}`, {
        method: 'DELETE',
      });

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

  return (
    <div className="min-h-screen bg-gray-50 pt-4 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-black  ">
            My Study Blocks
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Study Block
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Welcome message for first-time users */}
        {!loading && blocks.length === 0 && !showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Welcome to your Quiet Hours Scheduler!</h2>
            <p className="text-black  600 mb-4">
              Get started by creating your first study block. Set up focused study periods and receive 
              email reminders to help you stay on track.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Your First Study Block
            </button>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {editingBlock ? 'Edit Study Block' : 'Create New Study Block'}
                </h2>
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

        {/* Blocks List */}
        <BlockList
          blocks={blocks}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
        />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthWrapper>
      <Dashboard />
    </AuthWrapper>
  );
}
