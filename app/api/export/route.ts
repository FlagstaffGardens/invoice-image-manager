import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoices } = body

    if (!invoices || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: 'Invoices array is required' },
        { status: 400 }
      )
    }

    // Create CSV header
    const headers = ['Date', 'ABN', 'Amount (inc. GST)', 'GST', 'Description', 'Category']
    const csvRows = [headers.join(',')]

    // Add data rows
    for (const invoice of invoices) {
      const row = [
        invoice.date || '',
        invoice.abn || '',
        invoice.amount || '',
        invoice.gst || '',
        `"${(invoice.description || '').replace(/"/g, '""')}"`, // Escape quotes
        invoice.category || '',
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="invoices-${Date.now()}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export CSV' },
      { status: 500 }
    )
  }
}
