import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const uniqueId = randomBytes(4).toString('hex')
    const ext = path.extname(file.name)
    const uniqueFilename = `${uniqueId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    // Create upload directory if it doesn't exist
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploaded_files')
    await mkdir(uploadDir, { recursive: true })

    console.log('Upload directory:', uploadDir)
    console.log('CWD:', process.cwd())

    // Save file
    const filePath = path.join(uploadDir, uniqueFilename)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      filename: uniqueFilename,
      originalName: file.name,
      path: `/uploaded_files/${uniqueFilename}`,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
