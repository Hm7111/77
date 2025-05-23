import { useState } from 'react'
import { TemplateZonesPanel } from '../../../components/templates/TemplateZonesPanel'
import { TemplateZones } from '../TemplateZones'

export function TemplateZonesTab() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  return (
    <div>
      {selectedTemplateId ? (
        <div>
          <TemplateZonesPanel 
            templateId={selectedTemplateId} 
          />
          <div className="mt-4">
            <button
              onClick={() => setSelectedTemplateId(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              العودة لقائمة القوالب
            </button>
          </div>
        </div>
      ) : (
        <TemplateZones />
      )}
    </div>
  )
}