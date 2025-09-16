'use client';

import React, { useState } from 'react';
import { format, addMinutes } from 'date-fns';

interface StudyBlock {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  reminderSent: boolean;
  createdAt: string;
}

interface BlockFormProps {
  onSubmit: (data: { title: string; startTime: string; endTime: string }) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<StudyBlock>;
  isEditing?: boolean;
}

export function BlockForm({ onSubmit, onCancel, initialData, isEditing = false }: BlockFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [startTime, setStartTime] = useState(
    initialData?.startTime
      ? format(new Date(initialData.startTime), "yyyy-MM-dd'T'HH:mm")
      : ''
  );
  const [endTime, setEndTime] = useState(
    initialData?.endTime
      ? format(new Date(initialData.endTime), "yyyy-MM-dd'T'HH:mm")
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validation
      if (!title.trim()) {
        throw new Error('Title is required');
      }

      if (!startTime || !endTime) {
        throw new Error('Both start and end times are required');
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (start >= end) {
        throw new Error('End time must be after start time');
      }

      if (start <= new Date()) {
        throw new Error('Start time must be in the future');
      }

      // Ensure minimum lead time for email reminders (based on reminder window: 9-10 minutes)
      // Set minimum to 10 minutes to ensure the reminder window can catch it
      const REMINDER_WINDOW_END = 10; // minutes
      const minimumStartTime = addMinutes(new Date(), REMINDER_WINDOW_END);
      if (start < minimumStartTime) {
        throw new Error(`Start time must be at least ${REMINDER_WINDOW_END} minutes from now to ensure email reminder delivery`);
      }

      // Check minimum duration (e.g., 15 minutes)
      if (end.getTime() - start.getTime() < 15 * 60 * 1000) {
        throw new Error('Study block must be at least 15 minutes long');
      }

      await onSubmit({
        title: title.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      // Reset form if not editing
      if (!isEditing) {
        setTitle('');
        setStartTime('');
        setEndTime('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    
    // Auto-set end time to 1 hour later if not already set
    if (value && !endTime) {
      const start = new Date(value);
      const end = addMinutes(start, 60);
      setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const setQuickDuration = (minutes: number) => {
    if (startTime) {
      const start = new Date(startTime);
      const end = addMinutes(start, minutes);
      setEndTime(format(end, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  // Get minimum datetime (based on reminder window: 9-10 minutes, set to 10 minutes)
  const REMINDER_WINDOW_END = 10; // minutes
  const minDateTime = format(addMinutes(new Date(), REMINDER_WINDOW_END), "yyyy-MM-dd'T'HH:mm");

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-black   mb-4">
        {isEditing ? 'Edit Study Block' : 'Create New Study Block'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-black   mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Math Study Session, Research Paper Writing"
            className="w-full px-3 text-black py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            maxLength={200}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-black   mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              min={minDateTime}
              className="w-full px-3 py-2  text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              ⏰ Must be at least 12 minutes from now to ensure email reminder delivery
            </p>
          </div>

          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-black  700 mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              id="endTime"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              min={startTime || minDateTime}
              className="w-full px-3  text-black py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {startTime && (
          <div>
            <label className="block text-sm font-medium text-black   mb-2">
              Quick Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60, 90, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setQuickDuration(minutes)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-black  rounded-md transition-colors"
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-black  700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </div>
            ) : isEditing ? (
              'Update Block'
            ) : (
              'Create Block'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}