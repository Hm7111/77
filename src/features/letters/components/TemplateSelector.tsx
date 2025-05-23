import { useState } from 'react';
import { Search, Check } from 'lucide-react';
import type { Template } from '../../../types/database';

interface Props {
  templates: Template[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function TemplateSelector({ templates, selectedId, onSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن قالب..."
          className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            className={`p-4 border rounded-lg text-right transition-colors flex flex-col h-full ${
              selectedId === template.id
                ? 'border-primary bg-primary/5'
                : 'hover:border-gray-300'
            }`}
          >
            <div className="aspect-[1/1.414] mb-4 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={template.image_url}
                alt={template.name}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="flex-grow">
              <h3 className="font-medium mb-1">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
              )}
            </div>
            <div className={`mt-3 text-sm font-medium px-3 py-1.5 rounded-full text-center ${
              selectedId === template.id 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {selectedId === template.id ? 'تم الاختيار' : 'اختيار القالب'}
            </div>
          </button>
        ))}
      </div>
      
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Search className="mx-auto h-10 w-10 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">لم يتم العثور على قوالب</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'جرب استخدام كلمات بحث أخرى' : 'لا توجد قوالب متاحة حالياً'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm"
            >
              عرض جميع القوالب
            </button>
          )}
        </div>
      )}
    </div>
  );
}