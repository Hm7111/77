import { useState } from 'react'
import { Search, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Template } from '../../types/database'

interface Props {
  templates: Template[]
  selectedId: string
  onSelect: (id: string) => void
}

export default function TemplateSelector({ templates, selectedId, onSelect }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredTemplateId, setHoveredTemplateId] = useState<string | null>(null)
  
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      } 
    }
  }
  
  const templateVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 } 
    }
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث عن قالب..."
          className="w-full pl-3 pr-12 py-3 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredTemplates.map((template) => (
          <motion.div
            key={template.id}
            variants={templateVariants}
            className={`relative group cursor-pointer overflow-hidden rounded-xl border transition-all ${
              selectedId === template.id
                ? 'border-primary ring-1 ring-primary/30 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary/70'
            }`}
            onClick={() => onSelect(template.id)}
            onMouseEnter={() => setHoveredTemplateId(template.id)}
            onMouseLeave={() => setHoveredTemplateId(null)}
          >
            <div className="aspect-[1/1.414] bg-gray-50 dark:bg-gray-800 overflow-hidden">
              <div className="relative h-full w-full">
                <img
                  src={template.image_url}
                  alt={template.name}
                  className={`w-full h-full object-contain transition-transform duration-300 ${
                    hoveredTemplateId === template.id ? 'scale-[1.02]' : ''
                  }`}
                  loading="lazy"
                />
                
                <div className={`absolute inset-0 bg-primary/10 flex items-center justify-center opacity-0 transition-opacity duration-300 ${
                  hoveredTemplateId === template.id ? 'opacity-100' : ''
                }`}>
                  <div className="bg-white rounded-full p-1 shadow-md">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-gray-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 min-h-[2.5rem]">{template.description}</p>
                  )}
                </div>
                
                {selectedId === template.id && (
                  <div className="flex-shrink-0 h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(template.id);
                }}
                className={`w-full mt-3 py-2 rounded-lg transition-colors text-sm ${
                  selectedId === template.id
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {selectedId === template.id ? 'تم الاختيار' : 'اختيار القالب'}
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      {filteredTemplates.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">لم يتم العثور على قوالب</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery 
              ? 'لا توجد قوالب تطابق معايير البحث الحالية' 
              : 'لا توجد قوالب متاحة بعد'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-gray-200"
            >
              مسح البحث
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { TemplateSelector }