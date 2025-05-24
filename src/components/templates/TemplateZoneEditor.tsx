import { useState, useEffect, useRef } from 'react';
import { 
  X, Plus, Move, Save, Trash, Sliders, AlignLeft, AlignCenter, 
  AlignRight, GripHorizontal, DivideSquare, Layers, 
  Pencil, TextSelect, QrCode, Info, FileText, Calendar
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import type { Template, TemplateZone } from '../../types/database';

interface TemplateZoneEditorProps {
  template: Template;
  onClose: () => void;
  onSuccess: () => void;
}

export function TemplateZoneEditor({ 
  template, 
  onClose,
  onSuccess 
}: TemplateZoneEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [zones, setZones] = useState<TemplateZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rulers, setRulers] = useState(false);
  const [grid, setGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(10);
  
  // موضع QR Code
  const [qrPosition, setQrPosition] = useState({
    enabled: false,
    x: 40,
    y: 760, 
    size: 80,
    alignment: 'right'
  });
  
  // مواضع عناصر الخطاب المخصصة (الرقم والتاريخ والتوقيع)
  const [letterElements, setLetterElements] = useState({
    // رقم الخطاب
    letterNumber: {
      enabled: true,
      x: 85,
      y: 25,
      width: 32,
      alignment: 'right'
    },
    // تاريخ الخطاب
    letterDate: {
      enabled: true,
      x: 40,
      y: 60,
      width: 120,
      alignment: 'center'
    },
    // موضع التوقيع
    signature: {
      enabled: true,
      x: 40,
      y: 700,
      width: 150,
      height: 80,
      alignment: 'center'
    }
  });

  const { toast } = useToast();

  // حجم صفحة A4 بالبكسل (تقريبي)
  const PAGE_WIDTH = 595;
  const PAGE_HEIGHT = 842;
  
  // خيارات تنسيق الخطوط
  const fontFamilies = [
    { value: 'Cairo', label: 'Cairo' },
    { value: 'Noto Kufi Arabic', label: 'Noto Kufi Arabic' },
    { value: 'Tajawal', label: 'Tajawal' },
    { value: 'Arial', label: 'Arial' }
  ];
  
  const fontSizes = [
    { value: 10, label: '10px' },
    { value: 12, label: '12px' },
    { value: 14, label: '14px' },
    { value: 16, label: '16px' },
    { value: 18, label: '18px' },
    { value: 20, label: '20px' },
    { value: 24, label: '24px' }
  ];
  
  const alignments = [
    { value: 'right', label: 'يمين', icon: AlignRight },
    { value: 'center', label: 'وسط', icon: AlignCenter },
    { value: 'left', label: 'يسار', icon: AlignLeft }
  ];

  // تحميل المناطق عند بدء التحرير
  useEffect(() => {
    loadZones();
    loadCustomPositions();
  }, [template.id]);

  // وظيفة لتحميل مناطق الكتابة للقالب
  async function loadZones() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('template_zones')
        .select('*')
        .eq('template_id', template.id)
        .order('created_at');
      
      if (error) throw error;
      
      setZones(data || []);
      
      if (data && data.length > 0) {
        setSelectedZoneId(data[0].id);
      } else {
        setSelectedZoneId(null);
      }
      
    } catch (error) {
      console.error('Error loading template zones:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل مناطق الكتابة',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // تحميل إعدادات المواضع المخصصة (QR + عناصر أخرى)
  async function loadCustomPositions() {
    try {
      // تحميل موضع QR إذا كان موجوداً
      if (template.qr_position) {
        setQrPosition({
          ...qrPosition,
          ...template.qr_position,
          enabled: true
        });
      }
      
      // تحميل مواضع العناصر الأخرى إذا كانت موجودة
      if (template.letter_elements) {
        setLetterElements({
          ...letterElements,
          ...template.letter_elements
        });
      }
    } catch (error) {
      console.error('Error loading custom positions:', error);
    }
  }

  // إضافة منطقة كتابة جديدة
  function handleAddZone() {
    if (!previewRef.current) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    
    // حساب المنتصف لوضع المنطقة الجديدة
    const centerX = Math.floor(PAGE_WIDTH / 2 - 100);
    const centerY = Math.floor(PAGE_HEIGHT / 2 - 25);
    
    const newZone: Partial<TemplateZone> = {
      name: `منطقة ${zones.length + 1}`,
      template_id: template.id,
      x: centerX,
      y: centerY,
      width: 200,
      height: 50,
      font_size: 14,
      font_family: 'Cairo',
      alignment: 'right'
    };
    
    // إنشاء منطقة جديدة في قاعدة البيانات
    supabase
      .from('template_zones')
      .insert(newZone)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }
        
        setZones([...zones, data]);
        setSelectedZoneId(data.id);
        
        toast({
          title: 'تمت الإضافة',
          description: 'تم إضافة منطقة كتابة جديدة',
          type: 'success'
        });
      })
      .catch(error => {
        console.error('Error adding zone:', error);
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء إضافة منطقة الكتابة',
          type: 'error'
        });
      });
  }

  // تحديث اسم المنطقة
  function handleZoneNameChange(zoneId: string, name: string) {
    const updatedZones = zones.map(zone => 
      zone.id === zoneId ? { ...zone, name } : zone
    );
    setZones(updatedZones);
  }

  // تحديث أي خاصية للمنطقة
  function handleZonePropertyChange(zoneId: string, property: string, value: any) {
    const updatedZones = zones.map(zone => 
      zone.id === zoneId ? { ...zone, [property]: value } : zone
    );
    setZones(updatedZones);
  }

  // بدء عملية السحب للمناطق
  function handleDragStart(e: React.MouseEvent, zoneId: string) {
    e.preventDefault();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || !previewRef.current) return;
    
    setSelectedZoneId(zoneId);
    setIsDragging(true);
    
    // حساب نقطة البداية للسحب
    const containerRect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - zone.x;
    const offsetY = e.clientY - containerRect.top - zone.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    
    // إضافة مستمعات الحدث للتحرك والإفلات
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }

  // أثناء السحب
  function handleDragMove(e: MouseEvent) {
    if (!isDragging || !selectedZoneId || !previewRef.current) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    
    // حساب الموضع الجديد داخل الحدود
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;
    
    // تطبيق نظام الالتصاق بالشبكة إذا كان مفعلاً
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }
    
    // التأكد من بقاء المنطقة داخل حدود القالب
    newX = Math.max(0, Math.min(newX, PAGE_WIDTH - 50));
    newY = Math.max(0, Math.min(newY, PAGE_HEIGHT - 50));
    
    // تحويل القيم إلى أعداد صحيحة باستخدام Math.round()
    newX = Math.round(newX);
    newY = Math.round(newY);
    
    // تحديث موضع المنطقة
    setZones(zones.map(zone => 
      zone.id === selectedZoneId 
        ? { ...zone, x: newX, y: newY } 
        : zone
    ));
  }

  // إنهاء عملية السحب
  function handleDragEnd() {
    if (!isDragging || !selectedZoneId) return;
    
    const zone = zones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    
    // التأكد من أن الإحداثيات x و y هي أعداد صحيحة
    const x = Math.round(zone.x);
    const y = Math.round(zone.y);
    
    // حفظ الموضع الجديد في قاعدة البيانات
    supabase
      .from('template_zones')
      .update({ x, y })
      .eq('id', selectedZoneId)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating zone position:', error);
          toast({
            title: 'خطأ',
            description: 'حدث خطأ أثناء تحديث موضع المنطقة',
            type: 'error'
          });
        }
      });
    
    // إزالة مستمعات الحدث
    setIsDragging(false);
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }

  // بدء عملية التغيير الحجم
  function handleResizeStart(e: React.MouseEvent, zoneId: string, direction: string) {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedZoneId(zoneId);
    setIsResizing(true);
    
    // إضافة مستمعات الحدث للتحرك والإفلات
    const resizeHandler = (e: MouseEvent) => handleResizeMove(e, direction);
    window.addEventListener('mousemove', resizeHandler);
    window.addEventListener('mouseup', () => handleResizeEnd(resizeHandler));
  }

  // أثناء تغيير الحجم
  function handleResizeMove(e: MouseEvent, direction: string) {
    if (!isResizing || !selectedZoneId || !previewRef.current) return;
    
    const zone = zones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    let newX = zone.x;
    let newY = zone.y;
    let newWidth = zone.width;
    let newHeight = zone.height;
    
    // تعديل الأبعاد حسب اتجاه التغيير
    switch (direction) {
      case 'e': // يمين
        newWidth = Math.max(50, mouseX - zone.x);
        break;
      case 'w': // يسار
        const deltaW = zone.x - mouseX;
        newWidth = Math.max(50, zone.width + deltaW);
        newX = mouseX;
        break;
      case 's': // أسفل
        newHeight = Math.max(30, mouseY - zone.y);
        break;
      case 'n': // أعلى
        const deltaH = zone.y - mouseY;
        newHeight = Math.max(30, zone.height + deltaH);
        newY = mouseY;
        break;
      case 'se': // يمين أسفل
        newWidth = Math.max(50, mouseX - zone.x);
        newHeight = Math.max(30, mouseY - zone.y);
        break;
      case 'sw': // يسار أسفل
        const deltaSW = zone.x - mouseX;
        newWidth = Math.max(50, zone.width + deltaSW);
        newX = mouseX;
        newHeight = Math.max(30, mouseY - zone.y);
        break;
      case 'ne': // يمين أعلى
        newWidth = Math.max(50, mouseX - zone.x);
        const deltaNE = zone.y - mouseY;
        newHeight = Math.max(30, zone.height + deltaNE);
        newY = mouseY;
        break;
      case 'nw': // يسار أعلى
        const deltaNW = zone.x - mouseX;
        newWidth = Math.max(50, zone.width + deltaNW);
        newX = mouseX;
        const deltaNWH = zone.y - mouseY;
        newHeight = Math.max(30, zone.height + deltaNWH);
        newY = mouseY;
        break;
    }
    
    // تطبيق نظام الالتصاق بالشبكة إذا كان مفعلاً
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
      newWidth = Math.round(newWidth / gridSize) * gridSize;
      newHeight = Math.round(newHeight / gridSize) * gridSize;
    }
    
    // التأكد من بقاء المنطقة داخل حدود القالب
    newX = Math.max(0, Math.min(newX, PAGE_WIDTH - 50));
    newY = Math.max(0, Math.min(newY, PAGE_HEIGHT - 30));
    newWidth = Math.min(newWidth, PAGE_WIDTH - newX);
    newHeight = Math.min(newHeight, PAGE_HEIGHT - newY);
    
    // تحويل القيم إلى أعداد صحيحة
    newX = Math.round(newX);
    newY = Math.round(newY);
    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);
    
    // تحديث أبعاد المنطقة
    setZones(zones.map(z => 
      z.id === selectedZoneId 
        ? { ...z, x: newX, y: newY, width: newWidth, height: newHeight } 
        : z
    ));
  }

  // إنهاء عملية تغيير الحجم
  function handleResizeEnd(resizeHandler: (e: MouseEvent) => void) {
    if (!isResizing || !selectedZoneId) return;
    
    const zone = zones.find(z => z.id === selectedZoneId);
    if (!zone) return;
    
    // التأكد من أن جميع القيم هي أعداد صحيحة
    const x = Math.round(zone.x);
    const y = Math.round(zone.y);
    const width = Math.round(zone.width);
    const height = Math.round(zone.height);
    
    // حفظ الأبعاد الجديدة في قاعدة البيانات
    supabase
      .from('template_zones')
      .update({ 
        x, 
        y, 
        width, 
        height 
      })
      .eq('id', selectedZoneId)
      .then(({ error }) => {
        if (error) {
          console.error('Error updating zone dimensions:', error);
          toast({
            title: 'خطأ',
            description: 'حدث خطأ أثناء تحديث أبعاد المنطقة',
            type: 'error'
          });
        }
      });
    
    // إزالة مستمعات الحدث
    setIsResizing(false);
    window.removeEventListener('mousemove', resizeHandler);
    window.removeEventListener('mouseup', () => handleResizeEnd(resizeHandler));
  }

  // ===== وظائف تخصيص مواضع عناصر الخطاب =====

  // بدء سحب موضع رقم الخطاب
  function handleLetterNumberDragStart(e: React.MouseEvent) {
    e.preventDefault();
    if (!previewRef.current) return;
    
    setIsDragging(true);
    
    // حساب نقطة البداية للسحب
    const containerRect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - letterElements.letterNumber.x;
    const offsetY = e.clientY - containerRect.top - letterElements.letterNumber.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    
    // إضافة مستمعات الحدث للتحرك والإفلات
    window.addEventListener('mousemove', handleLetterNumberDragMove);
    window.addEventListener('mouseup', handleLetterNumberDragEnd);
  }

  // أثناء سحب رقم الخطاب
  function handleLetterNumberDragMove(e: MouseEvent) {
    if (!isDragging || !previewRef.current) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    
    // حساب الموضع الجديد داخل الحدود
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;
    
    // تطبيق نظام الالتصاق بالشبكة إذا كان مفعلاً
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }
    
    // التأكد من بقاء الرقم داخل حدود القالب
    newX = Math.max(0, Math.min(newX, PAGE_WIDTH - 50));
    newY = Math.max(0, Math.min(newY, PAGE_HEIGHT - 20));
    
    // تحويل القيم إلى أعداد صحيحة
    newX = Math.round(newX);
    newY = Math.round(newY);
    
    // تحديث موضع رقم الخطاب
    setLetterElements({
      ...letterElements,
      letterNumber: {
        ...letterElements.letterNumber,
        x: newX,
        y: newY
      }
    });
  }

  // إنهاء سحب رقم الخطاب
  function handleLetterNumberDragEnd() {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleLetterNumberDragMove);
    window.removeEventListener('mouseup', handleLetterNumberDragEnd);
  }

  // بدء سحب موضع تاريخ الخطاب
  function handleLetterDateDragStart(e: React.MouseEvent) {
    e.preventDefault();
    if (!previewRef.current) return;
    
    setIsDragging(true);
    
    // حساب نقطة البداية للسحب
    const containerRect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - letterElements.letterDate.x;
    const offsetY = e.clientY - containerRect.top - letterElements.letterDate.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    
    // إضافة مستمعات الحدث للتحرك والإفلات
    window.addEventListener('mousemove', handleLetterDateDragMove);
    window.addEventListener('mouseup', handleLetterDateDragEnd);
  }

  // أثناء سحب تاريخ الخطاب
  function handleLetterDateDragMove(e: MouseEvent) {
    if (!isDragging || !previewRef.current) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    
    // حساب الموضع الجديد داخل الحدود
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;
    
    // تطبيق نظام الالتصاق بالشبكة إذا كان مفعلاً
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }
    
    // التأكد من بقاء التاريخ داخل حدود القالب
    newX = Math.max(0, Math.min(newX, PAGE_WIDTH - 150));
    newY = Math.max(0, Math.min(newY, PAGE_HEIGHT - 20));
    
    // تحويل القيم إلى أعداد صحيحة
    newX = Math.round(newX);
    newY = Math.round(newY);
    
    // تحديث موضع تاريخ الخطاب
    setLetterElements({
      ...letterElements,
      letterDate: {
        ...letterElements.letterDate,
        x: newX,
        y: newY
      }
    });
  }

  // إنهاء سحب تاريخ الخطاب
  function handleLetterDateDragEnd() {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleLetterDateDragMove);
    window.removeEventListener('mouseup', handleLetterDateDragEnd);
  }

  // بدء سحب موضع التوقيع
  function handleSignatureDragStart(e: React.MouseEvent) {
    e.preventDefault();
    if (!previewRef.current) return;
    
    setIsDragging(true);
    
    // حساب نقطة البداية للسحب
    const containerRect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - letterElements.signature.x;
    const offsetY = e.clientY - containerRect.top - letterElements.signature.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    
    // إضافة مستمعات الحدث للتحرك والإفلات
    window.addEventListener('mousemove', handleSignatureDragMove);
    window.addEventListener('mouseup', handleSignatureDragEnd);
  }

  // أثناء سحب التوقيع
  function handleSignatureDragMove(e: MouseEvent) {
    if (!isDragging || !previewRef.current) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    
    // حساب الموضع الجديد داخل الحدود
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;
    
    // تطبيق نظام الالتصاق بالشبكة إذا كان مفعلاً
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }
    
    // التأكد من بقاء التوقيع داخل حدود القالب
    const sigWidth = letterElements.signature.width;
    const sigHeight = letterElements.signature.height;
    
    newX = Math.max(0, Math.min(newX, PAGE_WIDTH - sigWidth));
    newY = Math.max(0, Math.min(newY, PAGE_HEIGHT - sigHeight));
    
    // تحويل القيم إلى أعداد صحيحة
    newX = Math.round(newX);
    newY = Math.round(newY);
    
    // تحديث موضع التوقيع
    setLetterElements({
      ...letterElements,
      signature: {
        ...letterElements.signature,
        x: newX,
        y: newY
      }
    });
  }

  // إنهاء سحب التوقيع
  function handleSignatureDragEnd() {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleSignatureDragMove);
    window.removeEventListener('mouseup', handleSignatureDragEnd);
  }

  // بدء سحب موضع QR
  function handleQrDragStart(e: React.MouseEvent) {
    e.preventDefault();
    if (!previewRef.current) return;
    
    setIsDragging(true);
    
    // حساب نقطة البداية للسحب
    const containerRect = previewRef.current.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left - qrPosition.x;
    const offsetY = e.clientY - containerRect.top - qrPosition.y;
    
    setDragOffset({ x: offsetX, y: offsetY });
    
    // إضافة مستمعات الحدث للتحرك والإفلات
    window.addEventListener('mousemove', handleQrDragMove);
    window.addEventListener('mouseup', handleQrDragEnd);
  }

  // أثناء سحب QR
  function handleQrDragMove(e: MouseEvent) {
    if (!isDragging || !previewRef.current) return;
    
    const containerRect = previewRef.current.getBoundingClientRect();
    
    // حساب الموضع الجديد داخل الحدود
    let newX = e.clientX - containerRect.left - dragOffset.x;
    let newY = e.clientY - containerRect.top - dragOffset.y;
    
    // تطبيق نظام الالتصاق بالشبكة إذا كان مفعلاً
    if (snapToGrid) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }
    
    // التأكد من بقاء QR داخل حدود القالب
    const qrSize = qrPosition.size;
    newX = Math.max(0, Math.min(newX, PAGE_WIDTH - qrSize));
    newY = Math.max(0, Math.min(newY, PAGE_HEIGHT - qrSize));
    
    // تحويل القيم إلى أعداد صحيحة
    newX = Math.round(newX);
    newY = Math.round(newY);
    
    // تحديث موضع QR
    setQrPosition({
      ...qrPosition,
      x: newX,
      y: newY
    });
  }

  // إنهاء سحب QR
  function handleQrDragEnd() {
    setIsDragging(false);
    window.removeEventListener('mousemove', handleQrDragMove);
    window.removeEventListener('mouseup', handleQrDragEnd);
  }

  // تغيير حجم QR
  function handleQrSizeChange(size: number) {
    setQrPosition({
      ...qrPosition,
      size
    });
  }

  // حفظ جميع التغييرات
  async function handleSaveAllChanges() {
    setIsLoading(true);
    
    try {
      // حفظ كل منطقة
      for (const zone of zones) {
        // التأكد من أن جميع القيم هي أعداد صحيحة
        const x = Math.round(zone.x);
        const y = Math.round(zone.y);
        const width = Math.round(zone.width);
        const height = Math.round(zone.height);
        
        const { error } = await supabase
          .from('template_zones')
          .update({
            name: zone.name,
            x,
            y,
            width,
            height,
            font_size: zone.font_size,
            font_family: zone.font_family,
            alignment: zone.alignment
          })
          .eq('id', zone.id);
        
        if (error) throw error;
      }
      
      // تحديث مصفوفة المناطق في القالب نفسه
      const zonesData = zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        x: Math.round(zone.x),
        y: Math.round(zone.y),
        width: Math.round(zone.width),
        height: Math.round(zone.height),
        fontSize: zone.font_size,
        fontFamily: zone.font_family,
        alignment: zone.alignment
      }));
      
      // إعداد موضع QR
      const qrData = qrPosition.enabled 
        ? {
            x: qrPosition.x,
            y: qrPosition.y,
            size: qrPosition.size,
            alignment: qrPosition.alignment
          }
        : null;
      
      // إعداد مواضع العناصر الأخرى
      const letterElementsData = {
        letterNumber: letterElements.letterNumber,
        letterDate: letterElements.letterDate,
        signature: letterElements.signature
      };
      
      // تحديث القالب بجميع المواضع المخصصة
      const { error } = await supabase
        .from('letter_templates')
        .update({
          zones: zonesData,
          qr_position: qrData,
          letter_elements: letterElementsData
        })
        .eq('id', template.id);
      
      if (error) throw error;
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ جميع التغييرات بنجاح',
        type: 'success'
      });
      
      // استدعاء وظيفة النجاح
      onSuccess();
      
    } catch (error) {
      console.error('Error saving template zones:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ مناطق الكتابة',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }

  // تحديث حجم منطقة التوقيع
  function handleSignatureSizeChange(width: number, height: number) {
    setLetterElements({
      ...letterElements,
      signature: {
        ...letterElements.signature,
        width: Math.round(width),
        height: Math.round(height)
      }
    });
  }

  // تحديث حجم رقم الخطاب أو التاريخ
  function handleElementWidthChange(element: 'letterNumber' | 'letterDate', width: number) {
    setLetterElements({
      ...letterElements,
      [element]: {
        ...letterElements[element],
        width: Math.round(width)
      }
    });
  }

  // تبديل حالة المساطر
  function toggleRulers() {
    setRulers(!rulers);
  }

  // تبديل حالة الشبكة
  function toggleGrid() {
    setGrid(!grid);
  }

  // تبديل حالة الالتصاق بالشبكة
  function toggleSnapToGrid() {
    setSnapToGrid(!snapToGrid);
  }

  // تبديل حالة تفعيل QR
  function toggleQrEnabled() {
    setQrPosition({
      ...qrPosition,
      enabled: !qrPosition.enabled
    });
  }

  // تبديل تفعيل أحد عناصر الخطاب
  function toggleElementEnabled(element: 'letterNumber' | 'letterDate' | 'signature') {
    setLetterElements({
      ...letterElements,
      [element]: {
        ...letterElements[element],
        enabled: !letterElements[element].enabled
      }
    });
  }

  // الحصول على منطقة محددة
  const selectedZone = selectedZoneId 
    ? zones.find(zone => zone.id === selectedZoneId) 
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-7xl h-[90vh] flex flex-col">
        <div className="p-5 border-b dark:border-gray-800 flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <DivideSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">تخصيص قالب: {template.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRulers}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${rulers ? 'bg-primary/10 text-primary' : ''}`}
              title={rulers ? 'إخفاء المساطر' : 'إظهار المساطر'}
            >
              <Sliders className="h-5 w-5" />
            </button>
            
            <button
              onClick={toggleGrid}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${grid ? 'bg-primary/10 text-primary' : ''}`}
              title={grid ? 'إخفاء الشبكة' : 'إظهار الشبكة'}
            >
              <GripHorizontal className="h-5 w-5" />
            </button>
            
            <button
              onClick={toggleSnapToGrid}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 ${snapToGrid ? 'bg-primary/10 text-primary' : ''}`}
              title={snapToGrid ? 'تعطيل الالتصاق بالشبكة' : 'تفعيل الالتصاق بالشبكة'}
            >
              <DivideSquare className="h-5 w-5" />
            </button>
            
            <div className="h-6 border-r mx-1 border-gray-300 dark:border-gray-700"></div>
            
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-700 dark:text-gray-200 hover:text-red-600"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* منطقة المعاينة */}
          <div className="flex-1 border-l dark:border-gray-800 p-5 bg-gray-50 dark:bg-gray-900/50 overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={handleAddZone}
                  className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  إضافة منطقة كتابة
                </button>
                
                {snapToGrid && (
                  <select
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="text-sm p-1.5 border rounded-lg bg-white dark:bg-gray-800"
                  >
                    <option value="5">شبكة 5px</option>
                    <option value="10">شبكة 10px</option>
                    <option value="20">شبكة 20px</option>
                    <option value="25">شبكة 25px</option>
                    <option value="50">شبكة 50px</option>
                  </select>
                )}
              </div>
            </div>
            
            <div 
              className="bg-white dark:bg-gray-900 rounded-lg mx-auto relative editor-canvas"
              ref={previewRef}
              style={{
                width: `${PAGE_WIDTH}px`,
                height: `${PAGE_HEIGHT}px`,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* صورة القالب */}
              <img 
                src={template.image_url}
                alt={template.name}
                className="w-full h-full object-contain absolute top-0 left-0 z-0 pointer-events-none"
              />
              
              {/* المسطرة الأفقية */}
              {rulers && (
                <div className="absolute top-0 left-0 right-0 h-6 bg-gray-100/80 dark:bg-gray-800/80 z-20 pointer-events-none flex">
                  {Array.from({length: PAGE_WIDTH / 50}, (_, i) => (
                    <div key={`h-${i}`} className="w-[50px] h-full border-r border-gray-300 dark:border-gray-700 relative">
                      <span className="absolute bottom-0 right-1 text-[10px] text-gray-500">{i * 50}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* المسطرة العمودية */}
              {rulers && (
                <div className="absolute top-0 left-0 bottom-0 w-6 bg-gray-100/80 dark:bg-gray-800/80 z-20 pointer-events-none flex flex-col">
                  {Array.from({length: PAGE_HEIGHT / 50}, (_, i) => (
                    <div key={`v-${i}`} className="h-[50px] w-full border-b border-gray-300 dark:border-gray-700 relative">
                      <span className="absolute top-0 left-1 text-[10px] text-gray-500">{i * 50}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* الشبكة */}
              {grid && (
                <div className="absolute inset-0 z-10 pointer-events-none">
                  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                        <path 
                          d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} 
                          fill="none" 
                          stroke="rgba(0,0,0,0.1)" 
                          strokeWidth="0.5"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>
              )}
              
              {/* مناطق الكتابة */}
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute border-2 ${
                    selectedZoneId === zone.id ? 'border-primary' : 'border-gray-400 border-dashed'
                  } bg-white/50 dark:bg-black/20 cursor-move flex items-center justify-center group transition-colors`}
                  style={{
                    left: zone.x,
                    top: zone.y,
                    width: zone.width,
                    height: zone.height,
                    textAlign: zone.alignment as 'left' | 'center' | 'right',
                    zIndex: selectedZoneId === zone.id ? 30 : 20
                  }}
                  onClick={() => setSelectedZoneId(zone.id)}
                  onMouseDown={(e) => handleDragStart(e, zone.id)}
                >
                  {/* اسم المنطقة */}
                  <div className="absolute -top-6 right-0 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 select-none">
                    {zone.name}
                  </div>
                  
                  {/* نص للمعاينة */}
                  <div 
                    className="w-full h-full overflow-hidden flex items-center select-none"
                    style={{
                      fontFamily: zone.font_family,
                      fontSize: `${zone.font_size}px`,
                      textAlign: zone.alignment as 'left' | 'center' | 'right',
                      justifyContent: zone.alignment === 'right' ? 'flex-end' : 
                                     zone.alignment === 'center' ? 'center' : 'flex-start',
                      padding: '5px'
                    }}
                    dir="rtl"
                  >
                    نص معاينة {zone.name}
                  </div>
                  
                  {selectedZoneId === zone.id && (
                    <>
                      {/* مقابض تغيير الحجم */}
                      <div 
                        className="absolute top-0 left-0 w-3 h-3 bg-primary border border-white transform -translate-x-1/2 -translate-y-1/2 cursor-nw-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'nw')}
                      />
                      <div 
                        className="absolute top-0 right-0 w-3 h-3 bg-primary border border-white transform translate-x-1/2 -translate-y-1/2 cursor-ne-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'ne')}
                      />
                      <div 
                        className="absolute bottom-0 left-0 w-3 h-3 bg-primary border border-white transform -translate-x-1/2 translate-y-1/2 cursor-sw-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'sw')}
                      />
                      <div 
                        className="absolute bottom-0 right-0 w-3 h-3 bg-primary border border-white transform translate-x-1/2 translate-y-1/2 cursor-se-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'se')}
                      />
                      <div 
                        className="absolute top-0 left-1/2 w-3 h-3 bg-primary border border-white transform -translate-x-1/2 -translate-y-1/2 cursor-n-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'n')}
                      />
                      <div 
                        className="absolute bottom-0 left-1/2 w-3 h-3 bg-primary border border-white transform -translate-x-1/2 translate-y-1/2 cursor-s-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 's')}
                      />
                      <div 
                        className="absolute left-0 top-1/2 w-3 h-3 bg-primary border border-white transform -translate-x-1/2 -translate-y-1/2 cursor-w-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'w')}
                      />
                      <div 
                        className="absolute right-0 top-1/2 w-3 h-3 bg-primary border border-white transform translate-x-1/2 -translate-y-1/2 cursor-e-resize" 
                        onMouseDown={(e) => handleResizeStart(e, zone.id, 'e')}
                      />
                    </>
                  )}
                </div>
              ))}
              
              {/* موضع رقم الخطاب */}
              {letterElements.letterNumber.enabled && (
                <div
                  className={`absolute border-2 ${isDragging ? 'border-primary' : 'border-blue-500 border-dashed'} bg-white/50 cursor-move flex items-center justify-center text-sm`}
                  style={{
                    left: letterElements.letterNumber.x,
                    top: letterElements.letterNumber.y,
                    width: letterElements.letterNumber.width,
                    height: 20,
                    zIndex: 26
                  }}
                  onMouseDown={handleLetterNumberDragStart}
                >
                  <div className="absolute -top-6 right-0 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 select-none text-blue-500">
                    رقم الخطاب
                  </div>
                  <div className="w-full text-center">6</div>
                </div>
              )}
              
              {/* موضع تاريخ الخطاب */}
              {letterElements.letterDate.enabled && (
                <div
                  className={`absolute border-2 ${isDragging ? 'border-primary' : 'border-green-500 border-dashed'} bg-white/50 cursor-move flex items-center justify-center text-sm`}
                  style={{
                    left: letterElements.letterDate.x,
                    top: letterElements.letterDate.y,
                    width: letterElements.letterDate.width,
                    height: 20,
                    zIndex: 26
                  }}
                  onMouseDown={handleLetterDateDragStart}
                >
                  <div className="absolute -top-6 right-0 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 select-none text-green-500">
                    تاريخ الخطاب
                  </div>
                  <div className="w-full text-center">26/11/1445</div>
                </div>
              )}
              
              {/* موضع التوقيع */}
              {letterElements.signature.enabled && (
                <div
                  className={`absolute border-2 ${isDragging ? 'border-primary' : 'border-purple-500 border-dashed'} bg-white/50 cursor-move flex flex-col items-center justify-center`}
                  style={{
                    left: letterElements.signature.x,
                    top: letterElements.signature.y,
                    width: letterElements.signature.width,
                    height: letterElements.signature.height,
                    zIndex: 26
                  }}
                  onMouseDown={handleSignatureDragStart}
                >
                  <div className="absolute -top-6 right-0 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 select-none text-purple-500">
                    التوقيع
                  </div>
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-20 h-12 border-b border-gray-400 flex items-center justify-center text-xs text-gray-500">
                      توقيع المعتمد
                    </div>
                    <div className="mt-1 text-xs text-center">
                      مكان التوقيع
                    </div>
                  </div>
                </div>
              )}
              
              {/* رمز QR */}
              {qrPosition.enabled && (
                <div
                  className={`absolute border-2 ${isDragging ? 'border-primary' : 'border-orange-500 border-dashed'} bg-white/80 cursor-move flex flex-col items-center justify-center`}
                  style={{
                    left: qrPosition.x,
                    top: qrPosition.y,
                    width: qrPosition.size,
                    height: qrPosition.size,
                    zIndex: 25
                  }}
                  onMouseDown={handleQrDragStart}
                >
                  <div className="absolute -top-6 right-0 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border dark:border-gray-700 select-none text-orange-500">
                    رمز QR
                  </div>
                  
                  <div className="w-full h-full flex items-center justify-center">
                    <QrCode className="w-3/4 h-3/4 text-black/70" />
                  </div>
                </div>
              )}
            </div>
            
            {/* النصائح والإرشادات */}
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 p-4 rounded-lg text-blue-800 dark:text-blue-300">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <Info className="h-4 w-4" />
                نصائح الاستخدام:
              </h4>
              <ul className="text-sm list-disc list-inside space-y-1">
                <li>اسحب المناطق لتحديد موضعها على القالب</li>
                <li>استخدم المربعات الصغيرة في أطراف المنطقة المحددة لتغيير حجمها</li>
                <li>يمكنك تغيير خصائص كل منطقة من القائمة الجانبية</li>
                <li>يمكنك تحديد مواضع رقم الخطاب والتاريخ والتوقيع ورمز QR عن طريق سحبهم للمكان المناسب</li>
                <li>فعّل خيار "الالتصاق بالشبكة" للحصول على تحكم أدق في المواضع</li>
                <li>انقر على زر "حفظ التغييرات" بعد الانتهاء لحفظ جميع التعديلات</li>
              </ul>
            </div>
          </div>

          {/* منطقة الإعدادات */}
          <div className="w-80 p-4 space-y-4 overflow-auto">
            <div className="flex justify-between items-center sticky top-0 pb-3 bg-white dark:bg-gray-900 z-10">
              <h3 className="font-semibold text-lg">إعدادات العناصر</h3>
            </div>

            {/* تبويبات لأنواع العناصر المختلفة */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex border-b">
                <button
                  className={`flex-1 py-2 px-3 text-sm font-medium ${selectedZoneId ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  onClick={() => setSelectedZoneId(zones[0]?.id || null)}
                >
                  مناطق الكتابة
                </button>
                <button
                  className={`flex-1 py-2 px-3 text-sm font-medium ${!selectedZoneId ? 'bg-primary text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  onClick={() => setSelectedZoneId(null)}
                >
                  العناصر الثابتة
                </button>
              </div>

              <div className="p-4">
                {selectedZoneId ? (
                  /* إعدادات مناطق الكتابة */
                  <div className="space-y-4">
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-900">
                      <h4 className="font-medium mb-3">قائمة مناطق الكتابة</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {zones.map((zone) => (
                          <div
                            key={zone.id}
                            onClick={() => setSelectedZoneId(zone.id)}
                            className={`p-2 rounded-lg cursor-pointer ${
                              selectedZoneId === zone.id ? 'bg-primary/10 dark:bg-primary/20 border border-primary/50' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{zone.name}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('هل أنت متأكد من رغبتك في حذف هذه المنطقة؟')) {
                                    // وظيفة حذف المنطقة
                                    supabase
                                      .from('template_zones')
                                      .delete()
                                      .eq('id', zone.id)
                                      .then(({ error }) => {
                                        if (error) {
                                          console.error('Error deleting zone:', error);
                                          toast({
                                            title: 'خطأ',
                                            description: 'حدث خطأ أثناء حذف المنطقة',
                                            type: 'error'
                                          });
                                          return;
                                        }
                                        
                                        toast({
                                          title: 'تم الحذف',
                                          description: 'تم حذف المنطقة بنجاح',
                                          type: 'success'
                                        });
                                        
                                        setZones(zones.filter(z => z.id !== zone.id));
                                        if (selectedZoneId === zone.id) {
                                          setSelectedZoneId(zones.length > 1 ? zones[0].id : null);
                                        }
                                      });
                                  }
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedZone && (
                      <div className="space-y-4 border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-900">
                        <h4 className="font-medium mb-2">تعديل المنطقة: {selectedZone.name}</h4>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">اسم المنطقة</label>
                          <input
                            type="text"
                            value={selectedZone.name}
                            onChange={(e) => handleZoneNameChange(selectedZone.id, e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">الموضع والحجم</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">X</label>
                              <input
                                type="number"
                                value={selectedZone.x}
                                onChange={(e) => handleZonePropertyChange(selectedZone.id, 'x', parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Y</label>
                              <input
                                type="number"
                                value={selectedZone.y}
                                onChange={(e) => handleZonePropertyChange(selectedZone.id, 'y', parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">العرض</label>
                              <input
                                type="number"
                                value={selectedZone.width}
                                onChange={(e) => handleZonePropertyChange(selectedZone.id, 'width', parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">الارتفاع</label>
                              <input
                                type="number"
                                value={selectedZone.height}
                                onChange={(e) => handleZonePropertyChange(selectedZone.id, 'height', parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">نوع الخط</label>
                          <select
                            value={selectedZone.font_family}
                            onChange={(e) => handleZonePropertyChange(selectedZone.id, 'font_family', e.target.value)}
                            className="w-full p-2 border rounded-lg"
                            style={{ fontFamily: selectedZone.font_family }}
                          >
                            {fontFamilies.map(font => (
                              <option 
                                key={font.value} 
                                value={font.value}
                                style={{ fontFamily: font.value }}
                              >
                                {font.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">حجم الخط</label>
                          <select
                            value={selectedZone.font_size}
                            onChange={(e) => handleZonePropertyChange(selectedZone.id, 'font_size', parseInt(e.target.value))}
                            className="w-full p-2 border rounded-lg"
                          >
                            {fontSizes.map(size => (
                              <option key={size.value} value={size.value}>
                                {size.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">محاذاة النص</label>
                          <div className="flex border dark:border-gray-700 rounded-lg overflow-hidden">
                            {alignments.map(align => (
                              <button
                                key={align.value}
                                type="button"
                                className={`flex-1 py-2 flex items-center justify-center ${
                                  selectedZone.alignment === align.value
                                    ? 'bg-primary text-white'
                                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                                onClick={() => handleZonePropertyChange(selectedZone.id, 'alignment', align.value)}
                              >
                                <align.icon className="h-4 w-4" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* إعدادات العناصر الثابتة (رقم الخطاب، التاريخ، التوقيع) */
                  <div className="space-y-4">
                    {/* إعدادات رقم الخطاب */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                          <FileText className="h-4 w-4" />
                          موضع رقم الخطاب
                        </h4>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={letterElements.letterNumber.enabled}
                              onChange={() => toggleElementEnabled('letterNumber')}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:end-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                      
                      {letterElements.letterNumber.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">X</label>
                              <input
                                type="number"
                                value={letterElements.letterNumber.x}
                                onChange={(e) => setLetterElements({
                                  ...letterElements,
                                  letterNumber: {
                                    ...letterElements.letterNumber,
                                    x: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Y</label>
                              <input
                                type="number"
                                value={letterElements.letterNumber.y}
                                onChange={(e) => setLetterElements({
                                  ...letterElements,
                                  letterNumber: {
                                    ...letterElements.letterNumber,
                                    y: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">العرض</label>
                              <input
                                type="number"
                                value={letterElements.letterNumber.width}
                                onChange={(e) => handleElementWidthChange('letterNumber', parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">المحاذاة</label>
                              <div className="flex border dark:border-gray-700 rounded-lg overflow-hidden">
                                {alignments.map(align => (
                                  <button
                                    key={align.value}
                                    type="button"
                                    className={`flex-1 py-2 flex items-center justify-center ${
                                      letterElements.letterNumber.alignment === align.value
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                    onClick={() => setLetterElements({
                                      ...letterElements,
                                      letterNumber: {
                                        ...letterElements.letterNumber,
                                        alignment: align.value
                                      }
                                    })}
                                  >
                                    <align.icon className="h-4 w-4" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* إعدادات تاريخ الخطاب */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <Calendar className="h-4 w-4" />
                          موضع تاريخ الخطاب
                        </h4>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={letterElements.letterDate.enabled}
                              onChange={() => toggleElementEnabled('letterDate')}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:end-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                      
                      {letterElements.letterDate.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">X</label>
                              <input
                                type="number"
                                value={letterElements.letterDate.x}
                                onChange={(e) => setLetterElements({
                                  ...letterElements,
                                  letterDate: {
                                    ...letterElements.letterDate,
                                    x: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Y</label>
                              <input
                                type="number"
                                value={letterElements.letterDate.y}
                                onChange={(e) => setLetterElements({
                                  ...letterElements,
                                  letterDate: {
                                    ...letterElements.letterDate,
                                    y: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">العرض</label>
                              <input
                                type="number"
                                value={letterElements.letterDate.width}
                                onChange={(e) => handleElementWidthChange('letterDate', parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">المحاذاة</label>
                              <div className="flex border dark:border-gray-700 rounded-lg overflow-hidden">
                                {alignments.map(align => (
                                  <button
                                    key={align.value}
                                    type="button"
                                    className={`flex-1 py-2 flex items-center justify-center ${
                                      letterElements.letterDate.alignment === align.value
                                        ? 'bg-green-500 text-white'
                                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                    onClick={() => setLetterElements({
                                      ...letterElements,
                                      letterDate: {
                                        ...letterElements.letterDate,
                                        alignment: align.value
                                      }
                                    })}
                                  >
                                    <align.icon className="h-4 w-4" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* إعدادات التوقيع */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"></path>
                          </svg>
                          موضع التوقيع
                        </h4>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={letterElements.signature.enabled}
                              onChange={() => toggleElementEnabled('signature')}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:end-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                      
                      {letterElements.signature.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">X</label>
                              <input
                                type="number"
                                value={letterElements.signature.x}
                                onChange={(e) => setLetterElements({
                                  ...letterElements,
                                  signature: {
                                    ...letterElements.signature,
                                    x: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Y</label>
                              <input
                                type="number"
                                value={letterElements.signature.y}
                                onChange={(e) => setLetterElements({
                                  ...letterElements,
                                  signature: {
                                    ...letterElements.signature,
                                    y: parseInt(e.target.value)
                                  }
                                })}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">العرض</label>
                              <input
                                type="number"
                                value={letterElements.signature.width}
                                onChange={(e) => handleSignatureSizeChange(parseInt(e.target.value), letterElements.signature.height)}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">الارتفاع</label>
                              <input
                                type="number"
                                value={letterElements.signature.height}
                                onChange={(e) => handleSignatureSizeChange(letterElements.signature.width, parseInt(e.target.value))}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">المحاذاة</label>
                              <div className="flex border dark:border-gray-700 rounded-lg overflow-hidden">
                                {alignments.map(align => (
                                  <button
                                    key={align.value}
                                    type="button"
                                    className={`flex-1 py-2 flex items-center justify-center ${
                                      letterElements.signature.alignment === align.value
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                    onClick={() => setLetterElements({
                                      ...letterElements,
                                      signature: {
                                        ...letterElements.signature,
                                        alignment: align.value
                                      }
                                    })}
                                  >
                                    <align.icon className="h-4 w-4" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* إعدادات رمز QR */}
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 shadow-sm bg-white dark:bg-gray-900">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                          <QrCode className="h-4 w-4" />
                          موضع رمز QR
                        </h4>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={qrPosition.enabled}
                              onChange={toggleQrEnabled}
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:end-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                      
                      {qrPosition.enabled && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">X</label>
                              <input
                                type="number"
                                value={qrPosition.x}
                                onChange={(e) => setQrPosition({...qrPosition, x: parseInt(e.target.value)})}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Y</label>
                              <input
                                type="number"
                                value={qrPosition.y}
                                onChange={(e) => setQrPosition({...qrPosition, y: parseInt(e.target.value)})}
                                className="w-full p-2 border rounded-lg"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">الحجم:</label>
                              <input
                                type="range"
                                min="40"
                                max="150"
                                step="5"
                                value={qrPosition.size}
                                onChange={(e) => handleQrSizeChange(parseInt(e.target.value))}
                                className="w-full"
                              />
                              <div className="text-center text-xs mt-1">{qrPosition.size}px</div>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">المحاذاة</label>
                              <select 
                                value={qrPosition.alignment}
                                onChange={(e) => setQrPosition({...qrPosition, alignment: e.target.value as any})}
                                className="w-full p-2 border rounded-lg"
                              >
                                <option value="right">يمين</option>
                                <option value="center">وسط</option>
                                <option value="left">يسار</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t dark:border-gray-800 mt-auto sticky bottom-0 bg-white dark:bg-gray-900">
              <button
                type="button"
                onClick={handleSaveAllChanges}
                disabled={isLoading}
                className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                    <span>جارِ الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>حفظ جميع التغييرات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}