import { useState } from 'react';
import { Search, X, Check, Type, Book, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { letterTemplates } from '../../data/letterTemplates';
import type { TemplateCategory, LetterTemplate } from '../../types/templates';

interface TextTemplateSelectorProps {
  onSelectTemplate: (content: string) => void;
  onClose: () => void;
}

export function TextTemplateSelector({ onSelectTemplate, onClose }: TextTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);

  // Filter templates based on search query
  const filteredCategories = letterTemplates.filter(category => {
    if (selectedCategory && category.id !== selectedCategory) return false;
    
    if (!searchQuery) return true;
    
    const categoryMatches = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          category.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const templatesMatch = category.templates.some(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return categoryMatches || templatesMatch;
  });

  function handleSelectTemplate(template: LetterTemplate) {
    setSelectedTemplate(template);
  }

  function handleInsertTemplate() {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate.content);
      onClose();
    }
  }

  // Clean up template variables for better display
  function formatTemplateContent(content: string) {
    return content.replace(/\{([^}]+)\}/g, (_, variable) => {
      return `<span class="bg-primary/10 text-primary px-1 py-0.5 rounded">${variable}</span>`;
    });
  }

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    }
  };
  
  const modalVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.98 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 300, 
        damping: 25,
        delay: 0.1
      }
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={() => onClose()}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
    >
      <motion.div 
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        variants={modalVariants}
      >
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">نماذج نصية جاهزة</h2>
          </div>
          <button 
            onClick={() => onClose()} 
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-5 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث في النماذج النصية..."
                className="w-full pl-3 pr-10 py-2.5 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary/50 bg-white dark:bg-gray-800"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                  selectedCategory === null 
                    ? 'bg-primary text-white' 
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span>الكل</span>
                {selectedCategory === null && <Check className="h-4 w-4" />}
              </button>
              
              {letterTemplates.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>{category.name}</span>
                  {selectedCategory === category.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Template Categories and List */}
          <div className="w-2/5 border-l dark:border-gray-800 overflow-y-auto p-4">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M9 14h6" />
                  </svg>
                </div>
                <div className="text-lg font-medium mb-1">لم يتم العثور على نتائج</div>
                <p className="text-sm">جرب استخدام كلمات بحث أخرى أو اختر تصنيفاً آخر</p>
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {filteredCategories.map((category) => (
                    <motion.div 
                      key={category.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Type className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{category.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {category.templates.filter(template => 
                          !searchQuery || 
                          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.content.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(template => (
                          <motion.button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className={`w-full text-right p-3 rounded-lg transition-all ${
                              selectedTemplate?.id === template.id 
                                ? 'bg-primary/10 dark:bg-primary/20 border-2 border-primary text-primary'
                                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10'
                            }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex justify-between items-start">
                              <h4 className="font-medium text-gray-900 dark:text-white">{template.name}</h4>
                              {selectedTemplate?.id === template.id && (
                                <div className="h-5 w-5 bg-primary text-white rounded-full flex items-center justify-center">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 rtl mt-1">
                              {template.content.substring(0, 60).replace(/\n/g, ' ')}...
                            </p>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
          
          {/* Template Preview */}
          <div className="w-3/5 bg-gray-50 dark:bg-gray-900/50 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {selectedTemplate ? (
                <motion.div
                  key="template-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
                    <span className="text-xs py-0.5 px-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                      {letterTemplates.find(c => c.templates.some(t => t.id === selectedTemplate.id))?.name}
                    </span>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700 min-h-[300px] text-right rtl shadow-sm">
                    <div
                      dangerouslySetInnerHTML={{ 
                        __html: formatTemplateContent(selectedTemplate.content)
                      }}
                      className="whitespace-pre-wrap leading-relaxed text-base text-gray-900 dark:text-gray-100"
                      style={{ fontFamily: "Cairo, sans-serif" }}
                    />
                  </div>
                  
                  <div className="mt-4 p-4 bg-primary/10 border border-primary/25 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      ملاحظات
                    </h4>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-inside list-disc">
                      <li>الكلمات المميزة بلون مختلف هي متغيرات يمكنك تعديلها.</li>
                      <li>يمكنك تعديل النموذج بعد إضافته حسب احتياجاتك.</li>
                      <li>اضغط على زر "إدراج النموذج" لإضافة هذا النص إلى محرر الخطاب.</li>
                    </ul>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="template-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-center p-8"
                >
                  <div>
                    <FileText className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium mb-2">اختر نموذجاً من القائمة</h3>
                    <p className="text-sm max-w-sm">
                      استخدم النماذج الجاهزة لتسريع عملية كتابة الخطابات والحصول على تنسيق احترافي
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="p-5 border-t dark:border-gray-800 flex justify-between items-center sticky bottom-0 bg-white dark:bg-gray-900 z-10">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedTemplate && 'اضغط على "إدراج" ليتم إضافة النموذج إلى الخطاب'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleInsertTemplate}
              disabled={!selectedTemplate}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {selectedTemplate && (
                <>
                  <Check className="h-4 w-4" />
                  إدراج النموذج
                </>
              )}
              {!selectedTemplate && 'اختر نموذجاً أولاً'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}