import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';
import type { Template, TemplateZone } from '../../../types/database';

/**
 * هوك إدارة محرر القوالب
 */
export function useTemplateEditor() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [zones, setZones] = useState<TemplateZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  /**
   * تحميل مناطق قالب
   */
  const loadZones = useCallback(async (templateId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('template_zones')
        .select('*')
        .eq('template_id', templateId)
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
  }, [toast]);

  /**
   * إضافة منطقة جديدة
   */
  const addZone = useCallback(async (templateId: string, defaultPosition = { x: 50, y: 50 }) => {
    const newZone: Partial<TemplateZone> = {
      name: `منطقة ${zones.length + 1}`,
      template_id: templateId,
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: 200,
      height: 50,
      font_size: 14,
      font_family: 'Cairo',
      alignment: 'right'
    };
    
    try {
      // إنشاء منطقة جديدة في قاعدة البيانات
      const { data, error } = await supabase
        .from('template_zones')
        .insert(newZone)
        .select()
        .single();

      if (error) throw error;
      
      setZones([...zones, data]);
      setSelectedZoneId(data.id);
      
      toast({
        title: 'تمت الإضافة',
        description: 'تم إضافة منطقة كتابة جديدة',
        type: 'success'
      });
      
      return data;
    } catch (error) {
      console.error('Error adding zone:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إضافة منطقة الكتابة',
        type: 'error'
      });
      
      return null;
    }
  }, [zones, toast]);

  /**
   * تحديث خصائص منطقة
   */
  const updateZoneProperty = useCallback((zoneId: string, property: string, value: any) => {
    setZones(prevZones => 
      prevZones.map(zone => 
        zone.id === zoneId ? { ...zone, [property]: value } : zone
      )
    );
  }, []);

  /**
   * حفظ منطقة
   */
  const saveZone = useCallback(async (zone: TemplateZone) => {
    try {
      const { error } = await supabase
        .from('template_zones')
        .update({
          name: zone.name,
          x: zone.x,
          y: zone.y,
          width: zone.width,
          height: zone.height,
          font_size: zone.font_size,
          font_family: zone.font_family,
          alignment: zone.alignment
        })
        .eq('id', zone.id);
      
      if (error) throw error;
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات المنطقة بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error saving zone:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ إعدادات المنطقة',
        type: 'error'
      });
      
      return false;
    }
  }, [toast]);

  /**
   * حذف منطقة
   */
  const deleteZone = useCallback(async (zoneId: string) => {
    try {
      const { error } = await supabase
        .from('template_zones')
        .delete()
        .eq('id', zoneId);
      
      if (error) throw error;
      
      // تحديث القائمة
      setZones(zones.filter(zone => zone.id !== zoneId));
      if (selectedZoneId === zoneId) {
        setSelectedZoneId(zones.length > 1 ? zones[0].id : null);
      }
      
      toast({
        title: 'تم الحذف',
        description: 'تم حذف منطقة الكتابة بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting zone:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حذف منطقة الكتابة',
        type: 'error'
      });
      
      return false;
    }
  }, [zones, selectedZoneId, toast]);

  /**
   * حفظ جميع المناطق
   */
  const saveAllZones = useCallback(async (templateId: string) => {
    setIsLoading(true);
    
    try {
      // حفظ كل منطقة
      for (const zone of zones) {
        // تقريب القيم إلى أعداد صحيحة
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
      
      const { error } = await supabase
        .from('letter_templates')
        .update({
          zones: zonesData
        })
        .eq('id', templateId);
      
      if (error) throw error;
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ جميع التغييرات بنجاح',
        type: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error saving template zones:', error);
      
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ مناطق الكتابة',
        type: 'error'
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [zones, toast]);

  return {
    zones,
    selectedZoneId,
    isLoading,
    isDragging,
    isResizing,
    dragOffset,
    selectedZone: selectedZoneId ? zones.find(zone => zone.id === selectedZoneId) : null,
    setSelectedZoneId,
    setIsDragging,
    setIsResizing,
    setDragOffset,
    loadZones,
    addZone,
    updateZoneProperty,
    saveZone,
    deleteZone,
    saveAllZones,
    setZones
  };
}