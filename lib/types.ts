export interface InvoiceData {
  id: string
  filename: string
  imagePath: string
  date: string
  abn: string
  amount: string
  gst: string
  description: string
  category: string
  status: 'processing' | 'queued' | 'uploading' | 'extracting' | 'done' | 'error'
  error?: string
}

export interface ProcessingFile {
  id: string
  name: string
  status: 'queued' | 'uploading' | 'extracting' | 'done' | 'error'
  progress?: number
  error?: string
}
