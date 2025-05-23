// PDF Worker for handling PDF generation in a separate thread
const pdfWorker = `
  importScripts('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js')
  importScripts('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js')

  self.onmessage = async function(e) {
    const { letterContent, templateUrl } = e.data
    
    try {
      // Create PDF document
      const pdfDoc = await PDFLib.PDFDocument.create()
      const page = pdfDoc.addPage([595, 842]) // A4 size
      
      // Load template image
      const templateImage = await fetch(templateUrl).then(res => res.arrayBuffer())
      const template = await pdfDoc.embedPng(templateImage)
      
      // Draw template
      page.drawImage(template, {
        x: 0,
        y: 0,
        width: 595,
        height: 842
      })
      
      // Convert content to image using html2canvas
      const contentImage = await html2canvas(letterContent)
      const contentPng = await pdfDoc.embedPng(contentImage.toDataURL())
      
      // Draw content
      page.drawImage(contentPng, {
        x: 50,
        y: 50,
        width: 495,
        height: 742
      })
      
      // Save PDF
      const pdfBytes = await pdfDoc.save()
      
      self.postMessage({ success: true, pdf: pdfBytes })
    } catch (error) {
      self.postMessage({ success: false, error: error.message })
    }
  }
`

// Create Blob URL for the worker
const workerBlob = new Blob([pdfWorker], { type: 'application/javascript' })
const workerUrl = URL.createObjectURL(workerBlob)

// Export worker instance
export const worker = new Worker(workerUrl)

// Clean up
export function terminateWorker() {
  worker.terminate()
  URL.revokeObjectURL(workerUrl)
}