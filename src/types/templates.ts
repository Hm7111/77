export interface LetterTemplate {
  id: string;
  name: string;
  content: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: LetterTemplate[];
}