import React, { useState, useMemo } from 'react';
import { SortAsc, SortDesc } from 'lucide-react';
import { useLetters } from '../../hooks/useLetters';

export function LettersList() {
  const { letters, isLoading } = useLetters();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredLetters = useMemo(() => {
    if (!letters) return [];
    
    return letters.filter(letter => {
      const searchLower = searchQuery.toLowerCase();
      return (
        letter.content?.toString().toLowerCase().includes(searchLower) ||
        letter.creator_name?.toLowerCase().includes(searchLower) ||
        letter.verification_url?.toLowerCase().includes(searchLower)
      );
    });
  }, [letters, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search letters..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow border dark:border-gray-800">
        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <div className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredLetters.map((letter) => (
                <div key={letter.id} className="grid grid-cols-7 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <div className="px-4">{letter.number}</div>
                  <div className="px-4">{letter.creator_name}</div>
                  <div className="px-4 col-span-2">{letter.content?.toString().substring(0, 50)}...</div>
                  <div className="px-4">{new Date(letter.created_at).toLocaleDateString()}</div>
                  <div className="px-4">{letter.workflow_status}</div>
                  <div className="px-4">{letter.verification_url}</div>
                </div>
              ))}
              {filteredLetters.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  No letters found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LettersList;