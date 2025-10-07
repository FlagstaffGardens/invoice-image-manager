import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs/promises'
import path from 'path'

interface InvoiceExtraction {
  date: string
  abn: string
  amount_inc_gst: string
  gst: string
  description: string
  category: string
}

interface ExtractionResult {
  status: 'success' | 'error'
  file?: string
  data?: InvoiceExtraction
  message?: string
  raw_response?: string
}

export async function extractInvoiceData(
  imagePath: string
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://20250731.xyz/claude'
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'

  if (!apiKey) {
    return {
      status: 'error',
      message: 'ANTHROPIC_API_KEY not found in environment',
    }
  }

  try {
    // Read and encode image
    const imageBuffer = await fs.readFile(imagePath)
    const base64Image = imageBuffer.toString('base64')

    // Determine media type
    const ext = path.extname(imagePath).toLowerCase()
    const mediaTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }
    const mediaType = mediaTypeMap[ext] || 'image/jpeg'

    // System prompt
    const systemPrompt = `You are an expert at extracting data from Australian business invoices and receipts.

Your task is to extract the following information from invoice/receipt images:
1. Date - Transaction/invoice date (in DD/MM/YYYY format)
2. ABN (Australian Business Number) - 11 digit number, may have spaces
3. Amount (including GST) - Total amount paid/charged including GST
4. GST - GST/Tax amount (if shown separately)
5. Description - Brief description of what was purchased (items/services)
6. Category - Categorize the expense (e.g., Fuel, Food & Dining, Office Supplies, Transport, Accommodation, etc.)

Return the data in JSON format with the following structure:
{
    "date": "DD/MM/YYYY",
    "abn": "XX XXX XXX XXX",
    "amount_inc_gst": "$XX.XX",
    "gst": "$X.XX",
    "description": "Brief description of items/services",
    "category": "Category name"
}

Rules:
- Extract the transaction date and format as DD/MM/YYYY
- If ABN is not found, set abn to "Not found"
- If GST is not shown separately, try to calculate it from the total (GST = Total / 11 for Australian 10% GST)
- Keep descriptions concise but informative
- Choose the most appropriate category based on the merchant and items purchased
- Use Australian dollar format with $ sign`

    const userPrompt = `Extract the invoice data from this image and return it in the specified JSON format.

Make sure to:
- Extract the transaction date and format as DD/MM/YYYY
- Find the ABN (usually 11 digits, may be formatted as XX XXX XXX XXX)
- Get the total amount including GST
- Extract or calculate the GST amount
- Summarize what was purchased
- Categorize the expense appropriately

Return ONLY the JSON object, no additional text.`

    // Create client
    const client = new Anthropic({
      apiKey,
      baseURL: baseUrl,
    })

    // Make request
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as any,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    })

    // Extract text
    const content = response.content
    if (content && content.length > 0 && content[0].type === 'text') {
      let textContent = content[0].text

      // Remove markdown code blocks if present
      if (textContent.includes('```json')) {
        textContent = textContent.split('```json')[1].split('```')[0].trim()
      } else if (textContent.includes('```')) {
        textContent = textContent.split('```')[1].split('```')[0].trim()
      }

      try {
        const invoiceData = JSON.parse(textContent) as InvoiceExtraction

        return {
          status: 'success',
          file: path.basename(imagePath),
          data: invoiceData,
        }
      } catch (error) {
        return {
          status: 'error',
          message: 'Failed to parse JSON response',
          raw_response: textContent,
          file: path.basename(imagePath),
        }
      }
    }

    return {
      status: 'error',
      message: 'No content in response',
      file: path.basename(imagePath),
    }
  } catch (error) {
    return {
      status: 'error',
      message: `API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      file: path.basename(imagePath),
    }
  }
}
