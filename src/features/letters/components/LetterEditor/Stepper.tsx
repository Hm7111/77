import React from 'react';
import { FileText, Settings, Eye, FileEdit } from 'lucide-react';
import { LetterContent } from '../../types';
import { useToast } from '../../../../hooks/useToast';

interface StepperProps {
  activeStep: number;
  setActiveStep: (step: number) => void;
  steps: Array<{
    title: string;
    description: string;
  }>;
  content: LetterContent;
}

/**
 * مكون يعرض خطوات إنشاء الخطاب
 */
export default function Stepper({ activeStep, setActiveStep, steps, content }: StepperProps) {
  const { toast } = useToast();
  
  const handleStepClick = (stepIndex: number) => {
    // منع الذهاب للخطوات التالية إذا لم تكتمل المتطلبات السابقة
    if (stepIndex > activeStep) {
      if (stepIndex === 2 && (!content.subject || !content.to)) {
        toast({
          title: 'يجب إكمال الخطوات السابقة',
          description: 'الرجاء إدخال موضوع الخطاب والجهة المرسل إليها',
          type: 'warning'
        });
        return;
      }
      
      if (stepIndex === 3 && !content.templateId) {
        toast({
          title: 'يجب إكمال الخطوات السابقة',
          description: 'الرجاء اختيار قالب للخطاب',
          type: 'warning'
        });
        return;
      }
      
      if (stepIndex === 4 && !content.body) {
        toast({
          title: 'يجب إكمال الخطوات السابقة',
          description: 'الرجاء إدخال محتوى الخطاب',
          type: 'warning'
        });
        return;
      }
    }
    
    setActiveStep(stepIndex);
  };
  
  // أيقونات لكل خطوة
  const stepIcons = [Settings, FileText, FileEdit, Eye];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-y-2 z-10 cursor-pointer ${
              activeStep === i + 1 ? 'text-primary' : 'text-gray-400'
            }`}
            onClick={() => handleStepClick(i + 1)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              activeStep === i + 1 ? 'bg-primary text-white' : 'bg-gray-100'
            }`}>
              {React.createElement(stepIcons[i], { className: "h-5 w-5" })}
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
              <span className="text-xs text-gray-500 hidden md:block">{step.description}</span>
            </div>
          </div>
        ))}
        <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-200 -z-10">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((activeStep - 1) / 3) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}