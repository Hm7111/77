import React from 'react';
import { SortAsc, SortDesc } from 'lucide-react';

export function LettersList() {
  return (
    <div>
      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow border dark:border-gray-800">
        <div className="overflow-x-auto">
          <div className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <div className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {filteredLetters.map((letter) => (
                <div key={letter.id} className="grid grid-cols-7 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  {/* Letter row content */}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LettersList;