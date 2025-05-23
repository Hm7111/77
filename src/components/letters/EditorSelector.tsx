import React from 'react';
import { FileEdit } from 'lucide-react';

interface EditorSelectorProps {
  currentEditor: 'tinymce';
  onSelectEditor: (editor: 'tinymce') => void;
}

export function EditorSelector({ currentEditor, onSelectEditor }: EditorSelectorProps) {
  return (
    <div className="editor-toggle">
      <button
        onClick={() => onSelectEditor('tinymce')}
        className="active"
        title="استخدام محرر TinyMCE"
      >
        <FileEdit className="h-3.5 w-3.5 mr-1 inline-block" />
        <span>TinyMCE</span>
      </button>
    </div>
  );
}