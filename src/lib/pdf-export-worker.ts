// PDF Export Worker - Advanced PDF generation for Arabic support

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// Interfaz para datos de exportación
export interface ExportData {
  templateImageUrl: string;
  letterNumber: string;
  letterDate: string;
  letterContent: string;
  qrCodeUrl?: string;
  fileName: string;
}

// Función principal de exportación
export async function generateHighQualityPDF(data: ExportData): Promise<Uint8Array> {
  try {
    // Crear documento PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842]) // Tamaño A4
    
    // Cargar imagen de plantilla
    const templateImageBytes = await fetchImageAsBytes(data.templateImageUrl)
    const templateImage = await pdfDoc.embedJpg(templateImageBytes)
    
    // Dibujar plantilla en la página
    const { width, height } = page.getSize()
    page.drawImage(templateImage, {
      x: 0,
      y: 0,
      width,
      height,
    })
    
    // Añadir número de carta
    page.drawText(data.letterNumber, {
      x: width - 120,
      y: height - 50,
      size: 14,
      color: rgb(0, 0, 0)
    })
    
    // Añadir fecha
    page.drawText(data.letterDate, {
      x: width - 150,
      y: height - 80,
      size: 14,
      color: rgb(0, 0, 0)
    })
    
    // Añadir contenido
    // Nota: para contenido avanzado en árabe, convertimos a imagen
    const contentImageElement = await createContentImage(data.letterContent)
    const contentImageBytes = await elementToImageBytes(contentImageElement)
    const contentImage = await pdfDoc.embedJpg(contentImageBytes)
    
    page.drawImage(contentImage, {
      x: 50,
      y: 100,
      width: width - 100,
      height: height - 200,
    })
    
    // Añadir código QR si existe
    if (data.qrCodeUrl) {
      const qrImageBytes = await fetchImageAsBytes(data.qrCodeUrl)
      const qrImage = await pdfDoc.embedJpg(qrImageBytes)
      
      page.drawImage(qrImage, {
        x: 50,
        y: 50,
        width: 80,
        height: 80,
      })
    }
    
    // Serializar documento PDF
    return await pdfDoc.save()
  } catch (error) {
    console.error("Error generando PDF:", error)
    throw error
  }
}

// Funciones auxiliares

// Convertir elemento HTML a imagen
async function elementToImageBytes(element: HTMLElement): Promise<Uint8Array> {
  // Implementación simplificada - requiere html2canvas y canvas-to-blob
  // En una implementación real, se usaría html2canvas para convertir el elemento a canvas
  // y luego el canvas a un blob/arraybuffer
  
  // Placeholder para la implementación real
  return new Uint8Array([0]) // Placeholder
}

// Crear elemento para el contenido
async function createContentImage(content: string): Promise<HTMLElement> {
  const div = document.createElement('div')
  div.innerHTML = content
  div.style.cssText = `
    width: 500px;
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    line-height: 1.8;
    text-align: right;
    direction: rtl;
  `
  return div
}

// Obtener imagen como bytes
async function fetchImageAsBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}