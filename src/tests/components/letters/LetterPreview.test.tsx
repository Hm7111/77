import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LetterPreview from '../../../components/letters/LetterPreview'

describe('LetterPreview', () => {
  const mockTemplate = {
    id: '1',
    name: 'Test Template',
    image_url: 'https://example.com/template.png',
    description: 'Test Description',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category_id: null,
    variables: [],
    zones: [],
    parent_id: null,
    version: 1
  }

  const mockContent = {
    number: '123',
    date: '15/08/1445',
    body: 'Test content'
  }

  const mockProps = {
    template: mockTemplate,
    content: mockContent,
    onContentChange: vi.fn(),
    showDatePicker: false,
    onDateSelect: vi.fn(),
    currentHijriDay: 15,
    currentHijriMonth: 7,
    currentHijriYear: 1445,
    daysInMonth: 30,
    MONTHS_AR: ['محرم', 'صفر', 'ربيع الأول']
  }

  it('renders template background image', () => {
    render(<LetterPreview {...mockProps} />)
    const container = screen.getByRole('textbox', { name: /محتوى الخطاب/i })
    expect(container).toBeInTheDocument()
  })

  it('displays letter number', () => {
    render(<LetterPreview {...mockProps} />)
    const numberInput = screen.getByDisplayValue('123')
    expect(numberInput).toBeInTheDocument()
  })

  it('displays letter date', () => {
    render(<LetterPreview {...mockProps} />)
    const dateInput = screen.getByDisplayValue('15/08/1445')
    expect(dateInput).toBeInTheDocument()
  })

  it('shows date picker when enabled', () => {
    render(<LetterPreview {...mockProps} showDatePicker={true} />)
    const datePicker = screen.getByText('محرم')
    expect(datePicker).toBeInTheDocument()
  })

  it('calls onContentChange when body is edited', () => {
    render(<LetterPreview {...mockProps} />)
    const textarea = screen.getByRole('textbox', { name: /محتوى الخطاب/i })
    fireEvent.change(textarea, { target: { value: 'New content' } })
    expect(mockProps.onContentChange).toHaveBeenCalledWith({
      ...mockContent,
      body: 'New content'
    })
  })
})