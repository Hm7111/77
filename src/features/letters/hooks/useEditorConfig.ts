import { useState, useCallback } from 'react';
import { EditorConfig } from '../types/letters';

export function useEditorConfig(initialConfig?: Partial<EditorConfig>) {
  const [editorConfig, setEditorConfig] = useState<EditorConfig>({
    fontSize: initialConfig?.fontSize || '16px',
    lineHeight: initialConfig?.lineHeight || 1.5,
    fontFamily: initialConfig?.fontFamily || 'Cairo',
  });

  const updateFontSize = useCallback((fontSize: string) => {
    setEditorConfig(prev => ({ ...prev, fontSize }));
  }, []);

  const updateLineHeight = useCallback((lineHeight: number) => {
    setEditorConfig(prev => ({ ...prev, lineHeight }));
  }, []);

  const updateFontFamily = useCallback((fontFamily: string) => {
    setEditorConfig(prev => ({ ...prev, fontFamily }));
  }, []);

  const updateConfig = useCallback((config: Partial<EditorConfig>) => {
    setEditorConfig(prev => ({ ...prev, ...config }));
  }, []);

  return {
    editorConfig,
    updateFontSize,
    updateLineHeight,
    updateFontFamily,
    updateConfig,
  };
}