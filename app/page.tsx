'use client'

import { useState, useRef, useCallback } from 'react'
import { InvoiceData, ProcessingFile } from '@/lib/types'

export default function HomePage() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([])
  const [processing, setProcessing] = useState<ProcessingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle file drop
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    await handleFiles(files)
  }, [])

  // Handle file select
  const onFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await handleFiles(files)
  }, [])

  // Process files with concurrent limit
  async function handleFiles(files: File[]) {
    setIsUploading(true)

    // Create processing entries
    const newProcessing: ProcessingFile[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'queued',
    }))
    setProcessing(newProcessing)

    // Process up to 3 at a time
    const batchSize = 3
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchProcessing = newProcessing.slice(i, i + batchSize)

      await Promise.all(
        batch.map((file, idx) => processFile(file, batchProcessing[idx]))
      )
    }

    setProcessing([])
    setIsUploading(false)
  }

  // Process single file
  async function processFile(file: File, processingEntry: ProcessingFile) {
    try {
      // Update status: uploading
      setProcessing((prev) =>
        prev.map((p) => (p.id === processingEntry.id ? { ...p, status: 'uploading' } : p))
      )

      // Upload file
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) throw new Error('Upload failed')

      const uploadData = await uploadRes.json()

      // Update status: extracting
      setProcessing((prev) =>
        prev.map((p) => (p.id === processingEntry.id ? { ...p, status: 'extracting' } : p))
      )

      // Process with Claude
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadData.filename }),
      })

      if (!processRes.ok) {
        let message = 'Processing failed'
        try {
          const err = await processRes.json()
          if (err?.error) message = err.error
        } catch {}
        throw new Error(message)
      }

      const processData = await processRes.json()

      // Add to invoices
      const newInvoice: InvoiceData = {
        id: Math.random().toString(36).substr(2, 9),
        filename: uploadData.filename,
        imagePath: uploadData.path,
        date: processData.data.date || '',
        abn: processData.data.abn || '',
        amount: processData.data.amount_inc_gst || '',
        gst: processData.data.gst || '',
        description: processData.data.description || '',
        category: processData.data.category || '',
        status: 'done',
      }

      setInvoices((prev) => [...prev, newInvoice])

      // Update status: done
      setProcessing((prev) =>
        prev.map((p) => (p.id === processingEntry.id ? { ...p, status: 'done' } : p))
      )
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message)
      }
      // Update status: error
      setProcessing((prev) =>
        prev.map((p) =>
          p.id === processingEntry.id
            ? { ...p, status: 'error', error: error instanceof Error ? error.message : 'Error' }
            : p
        )
      )
    }
  }

  // Export CSV
  async function exportCSV() {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices }),
      })

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoices-${Date.now()}.csv`
      a.click()
    } catch (error) {
      alert('Failed to export CSV')
    }
  }

  // Delete single invoice
  async function deleteInvoice(invoice: InvoiceData) {
    try {
      await fetch(`/api/delete?filename=${invoice.filename}`, {
        method: 'DELETE',
      })
      setInvoices((prev) => prev.filter((i) => i.id !== invoice.id))
    } catch (error) {
      alert('Failed to delete invoice')
    }
  }

  // Clear all
  async function clearAll() {
    if (!confirm('Delete all invoices and files?')) return

    try {
      await fetch('/api/delete?all=true', { method: 'DELETE' })
      setInvoices([])
    } catch (error) {
      alert('Failed to clear invoices')
    }
  }

  // Update invoice field
  function updateInvoice(id: string, field: keyof InvoiceData, value: string) {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, [field]: value } : inv))
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">📸 Invoice Manager</h1>
        <p className="text-gray-400 mb-8">AI-powered invoice data extraction with Claude Vision</p>

        {/* Upload Zone */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-4 border-dashed border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors bg-gray-800/50"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={onFileSelect}
          />
          <div className="text-6xl mb-4">📤</div>
          <p className="text-xl text-white mb-2">Drop invoices here or click to browse</p>
          <p className="text-gray-400">Supports JPG, PNG, WEBP</p>
        </div>

        {/* Processing Cards */}
        {processing.length > 0 && (
          <div className="mt-8 space-y-4">
            {processing.map((p) => (
              <div key={p.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    p.status === 'queued' ? 'bg-gray-500' :
                    p.status === 'uploading' ? 'bg-blue-500 animate-pulse' :
                    p.status === 'extracting' ? 'bg-yellow-500 animate-pulse' :
                    p.status === 'done' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-white">{p.name}</span>
                </div>
                <span className="text-gray-400 capitalize">{p.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {invoices.length > 0 && (
          <div className="mt-8 flex gap-4">
            <button
              onClick={exportCSV}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              💾 Export CSV
            </button>
            <button
              onClick={clearAll}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              🗑️ Clear All
            </button>
          </div>
        )}

        {/* Invoice Table */}
        {invoices.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-white font-medium">Image</th>
                    <th className="px-4 py-3 text-left text-white font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-white font-medium">ABN</th>
                    <th className="px-4 py-3 text-left text-white font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-white font-medium">GST</th>
                    <th className="px-4 py-3 text-left text-white font-medium">Description</th>
                    <th className="px-4 py-3 text-left text-white font-medium">Category</th>
                    <th className="px-4 py-3 text-left text-white font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <img
                          src={inv.imagePath}
                          alt="Invoice"
                          className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                          onClick={() => setPreviewImage(inv.imagePath)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inv.date}
                          onChange={(e) => updateInvoice(inv.id, 'date', e.target.value)}
                          className={`px-2 py-1 rounded w-full ${
                            inv.date.includes('⚠️') || !inv.date
                              ? 'bg-red-900 text-red-200 border-2 border-red-500'
                              : 'bg-gray-700 text-white'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inv.abn}
                          onChange={(e) => updateInvoice(inv.id, 'abn', e.target.value)}
                          className={`px-2 py-1 rounded w-full ${
                            inv.abn.includes('⚠️') || !inv.abn
                              ? 'bg-red-900 text-red-200 border-2 border-red-500'
                              : 'bg-gray-700 text-white'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inv.amount}
                          onChange={(e) => updateInvoice(inv.id, 'amount', e.target.value)}
                          className={`px-2 py-1 rounded w-full ${
                            inv.amount.includes('⚠️') || !inv.amount
                              ? 'bg-red-900 text-red-200 border-2 border-red-500'
                              : 'bg-gray-700 text-white'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inv.gst}
                          onChange={(e) => updateInvoice(inv.id, 'gst', e.target.value)}
                          className={`px-2 py-1 rounded w-full ${
                            inv.gst.includes('⚠️') || !inv.gst
                              ? 'bg-red-900 text-red-200 border-2 border-red-500'
                              : 'bg-gray-700 text-white'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inv.description}
                          onChange={(e) => updateInvoice(inv.id, 'description', e.target.value)}
                          className={`px-2 py-1 rounded w-full ${
                            inv.description.includes('⚠️') || !inv.description
                              ? 'bg-red-900 text-red-200 border-2 border-red-500'
                              : 'bg-gray-700 text-white'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={inv.category}
                          onChange={(e) => updateInvoice(inv.id, 'category', e.target.value)}
                          className={`px-2 py-1 rounded w-full ${
                            inv.category.includes('⚠️') || !inv.category
                              ? 'bg-red-900 text-red-200 border-2 border-red-500'
                              : 'bg-gray-700 text-white'
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteInvoice(inv)}
                          className="text-red-500 hover:text-red-400"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-5xl max-h-full">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-4 -right-4 bg-red-600 hover:bg-red-700 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl"
              >
                ×
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
