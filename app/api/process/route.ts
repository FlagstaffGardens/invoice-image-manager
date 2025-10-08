import { NextRequest, NextResponse } from 'next/server'
import { extractInvoiceData } from '@/lib/extract-invoice'
import path from 'path'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename } = body

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      )
    }

    // Get the full path to the uploaded file
    const uploadDir = path.join(process.cwd(), 'public', 'uploaded_files')
    const filePath = path.join(uploadDir, filename)

    // Extract invoice data
    const result = await extractInvoiceData(filePath)

    if (result.status === 'error') {
      console.error('Extraction error:', result.message)
      return NextResponse.json(
        { error: result.message || 'Extraction failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
