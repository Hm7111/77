export * from './pdfExport';
export * from './print';
export * from './verification';

/**
 * التحقق من حالة الاتصال
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(window.location.origin, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}