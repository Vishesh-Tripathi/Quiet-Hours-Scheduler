'use client';

import React, { useState } from 'react';
import { format, isPast, isFuture, isToday, differenceInMinutes } from 'date-fns';

interface StudyBlock {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  reminderSent: boolean;
  createdAt: string;
}

interface BlockListProps {
  blocks: StudyBlock[];
  onEdit: (block: StudyBlock) => void;
  onDelete: (blockId: string) => Promise<void>;
  loading?: boolean;
}

export function BlockList({ blocks, onEdit, onDelete, loading = false }: BlockListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (blockId: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      setDeletingId(blockId);
      try {
        await onDelete(blockId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getBlockStatus = (block: StudyBlock) => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    const now = new Date();

    if (isPast(end)) {
      return { status: 'completed', color: 'gray', label: 'Completed' };
    } else if (now >= start && now <= end) {
      return { status: 'active', color: 'green', label: 'Active Now' };
    } else if (isFuture(start)) {
      const minutesUntilStart = differenceInMinutes(start, now);
      if (minutesUntilStart <= 10) {
        return { status: 'starting-soon', color: 'yellow', label: 'Starting Soon' };
      }
      return { status: 'upcoming', color: 'blue', label: 'Upcoming' };
    }
    
    return { status: 'unknown', color: 'gray', label: 'Unknown' };
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isToday(start)) {
      return `Today ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    }
    
    return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = differenceInMinutes(end, start);
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-gray-400 text-6xl mb-4">📚</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No study blocks yet</h3>
        <p className="text-gray-500 mb-4">
          Create your first study block to start managing your quiet hours.
        </p>
      </div>
    );
  }

  // Sort blocks by start time
  const sortedBlocks = [...blocks].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Separate upcoming and past blocks
  const now = new Date();
  const upcomingBlocks = sortedBlocks.filter(block => 
    new Date(block.endTime) > now
  );
  const pastBlocks = sortedBlocks.filter(block => 
    new Date(block.endTime) <= now
  );

  return (
    <div className="space-y-6">
      {/* Upcoming Blocks */}
      {upcomingBlocks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Upcoming Study Blocks ({upcomingBlocks.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingBlocks.map((block) => {
              const blockStatus = getBlockStatus(block);
              return (
                <div key={block._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {block.title}
                        </h4>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            blockStatus.color === 'green'
                              ? 'bg-green-100 text-green-800'
                              : blockStatus.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800'
                              : blockStatus.color === 'blue'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {blockStatus.label}
                        </span>
                        {block.reminderSent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            ✉️ Reminder Sent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>🕒 {formatTimeRange(block.startTime, block.endTime)}</span>
                        <span>⏱️ {getDuration(block.startTime, block.endTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => onEdit(block)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit block"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(block._id, block.title)}
                        disabled={deletingId === block._id}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Delete block"
                      >
                        {deletingId === block._id ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Blocks */}
      {pastBlocks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Completed Study Blocks ({pastBlocks.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {pastBlocks.slice(0, 5).map((block) => (
              <div key={block._id} className="p-6 hover:bg-gray-50 transition-colors opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {block.title}
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        ✅ Completed
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>🕒 {formatTimeRange(block.startTime, block.endTime)}</span>
                      <span>⏱️ {getDuration(block.startTime, block.endTime)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(block._id, block.title)}
                    disabled={deletingId === block._id}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete block"
                  >
                    {deletingId === block._id ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pastBlocks.length > 5 && (
            <div className="px-6 py-3 bg-gray-50 text-center text-sm text-gray-600">
              ... and {pastBlocks.length - 5} more completed blocks
            </div>
          )}
        </div>
      )}
    </div>
  );
}