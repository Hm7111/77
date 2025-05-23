import { useState, useCallback } from 'react';
import { EditorState } from '../types/letters';

export function useEditorState(initialState?: Partial<EditorState>) {
  const [editorState, setEditorState] = useState<EditorState>({
    activeStep: initialState?.activeStep || 1,
    previewMode: initialState?.previewMode || false,
    showGuides: initialState?.showGuides || false,
    editorStyle: initialState?.editorStyle || 'outside',
    previewScale: initialState?.previewScale || 'fit',
    livePreview: initialState?.livePreview || true,
    showQRInEditor: initialState?.showQRInEditor || false,
    showTemplateSelector: initialState?.showTemplateSelector || false,
    editorType: initialState?.editorType || 'tinymce',
    showEditorControls: initialState?.showEditorControls || true,
    autosaveEnabled: initialState?.autosaveEnabled || true,
  });

  const setActiveStep = useCallback((step: number) => {
    setEditorState(prev => ({ ...prev, activeStep: step }));
  }, []);

  const togglePreviewMode = useCallback(() => {
    setEditorState(prev => ({ ...prev, previewMode: !prev.previewMode }));
  }, []);

  const toggleShowGuides = useCallback(() => {
    setEditorState(prev => ({ ...prev, showGuides: !prev.showGuides }));
  }, []);

  const toggleEditorStyle = useCallback(() => {
    setEditorState(prev => ({ ...prev, editorStyle: prev.editorStyle === 'inside' ? 'outside' : 'inside' }));
  }, []);

  const togglePreviewScale = useCallback(() => {
    setEditorState(prev => ({ ...prev, previewScale: prev.previewScale === 'fit' ? 'actual' : 'fit' }));
  }, []);

  const toggleLivePreview = useCallback(() => {
    setEditorState(prev => ({ ...prev, livePreview: !prev.livePreview }));
  }, []);

  const toggleShowQRInEditor = useCallback(() => {
    setEditorState(prev => ({ ...prev, showQRInEditor: !prev.showQRInEditor }));
  }, []);

  const toggleShowTemplateSelector = useCallback(() => {
    setEditorState(prev => ({ ...prev, showTemplateSelector: !prev.showTemplateSelector }));
  }, []);

  const toggleShowEditorControls = useCallback(() => {
    setEditorState(prev => ({ ...prev, showEditorControls: !prev.showEditorControls }));
  }, []);

  const toggleAutosaveEnabled = useCallback(() => {
    setEditorState(prev => ({ ...prev, autosaveEnabled: !prev.autosaveEnabled }));
  }, []);

  const updateState = useCallback((state: Partial<EditorState>) => {
    setEditorState(prev => ({ ...prev, ...state }));
  }, []);

  return {
    editorState,
    setActiveStep,
    togglePreviewMode,
    toggleShowGuides,
    toggleEditorStyle,
    togglePreviewScale,
    toggleLivePreview,
    toggleShowQRInEditor,
    toggleShowTemplateSelector,
    toggleShowEditorControls,
    toggleAutosaveEnabled,
    updateState,
  };
}