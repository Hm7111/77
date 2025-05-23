import { ViewableLetterEditor } from '../../components/letters/ViewableLetterEditor'
import { useParams } from 'react-router-dom'

export function ViewLetter() {
  const { id } = useParams();
  
  // للتشخيص - طباعة المعرف للمساعدة في تتبع المشكلات
  console.log('Viewing letter with ID:', id);
  
  return <ViewableLetterEditor />
}