import { NextRequest, NextResponse } from 'next/server'
import { unlink, readdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    const all = searchParams.get('all')

    const uploadDir = path.join(process.cwd(), 'public', 'uploaded_files')

    if (all === 'true') {
      // Delete all files
      try {
        const files = await readdir(uploadDir)
        await Promise.all(
          files.map((file) => unlink(path.join(uploadDir, file)))
        )
        return NextResponse.json({
          success: true,
          message: `Deleted ${files.length} files`,
        })
      } catch (error) {
        // Directory might not exist, that's okay
        return NextResponse.json({
          success: true,
          message: 'No files to delete',
        })
      }
    } else if (filename) {
      // Delete single file
      const filePath = path.join(uploadDir, filename)
      try {
        await unlink(filePath)
        return NextResponse.json({
          success: true,
          message: `Deleted ${filename}`,
        })
      } catch (error) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Filename or all parameter required' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
