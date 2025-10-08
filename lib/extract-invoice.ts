import fs from 'fs/promises'
import path from 'path'

interface InvoiceExtraction {
  date: string
  abn: string
  amount_inc_gst: string | number
  gst: string | number
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
  // Optional local dev bypass
  if (process.env.MOCK_EXTRACTION === 'true' || process.env.MOCK_EXTRACTION === '1') {
    return {
      status: 'success',
      file: path.basename(imagePath),
      data: {
        date: '01/10/2025',
        abn: '12 345 678 901',
        amount_inc_gst: '$42.90',
        gst: '$3.90',
        description: 'Fuel purchase',
        category: 'Fuel',
      },
    }
  }
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://20250731.xyz/openai'
  const model = process.env.OPENAI_MODEL || 'gpt-4o'

  if (!apiKey) {
    return {
      status: 'error',
      message: 'OPENAI_API_KEY not found in environment',
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

    const userPrompt = `Extract invoice data and return ONLY a valid JSON object with these EXACT field names:

{
  "date": "DD/MM/YYYY",
  "abn": "11-digit ABN or 'Not found'",
  "amount_inc_gst": "$XX.XX",
  "gst": "$X.XX",
  "description": "Brief description",
  "category": "Category name"
}

INSTRUCTIONS:
- DATE: Find transaction/invoice date. Format as DD/MM/YYYY with 4-digit year
- ABN: Find Australian Business Number (11 digits, may have spaces)
- AMOUNT_INC_GST: Total amount paid/charged (including GST)
- GST: Tax amount. If not shown, calculate: Total ÷ 11
- DESCRIPTION: What was purchased (be specific)
- CATEGORY: Choose from: Food & Dining, Fuel, Transport, Office Supplies, Postage, Accommodation, Utilities, Other

Return ONLY the JSON object. No markdown code blocks. No explanations.`

    // Make API request using OpenAI format
    const apiUrl = `${baseUrl}/v1/chat/completions`
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }

    const payload = {
      model,
      max_tokens: 1024,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
    }

    let response
    try {
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        return {
          status: 'error',
          message: `API request failed (${apiResponse.status}): ${errorText}`,
          file: path.basename(imagePath),
        }
      }

      response = await apiResponse.json()
    } catch (err: any) {
      return {
        status: 'error',
        message: `API request failed: ${err?.message || String(err)}`,
        file: path.basename(imagePath),
      }
    }

    // Extract text from OpenAI response format
    const choices = response.choices
    if (choices && choices.length > 0 && choices[0].message) {
      let textContent = choices[0].message.content

      // Remove markdown code blocks if present
      if (textContent.includes('```json')) {
        textContent = textContent.split('```json')[1].split('```')[0].trim()
      } else if (textContent.includes('```')) {
        textContent = textContent.split('```')[1].split('```')[0].trim()
      }

      try {
        const rawData = JSON.parse(textContent) as any

        // Map response fields (handle both naming conventions)
        const invoiceData: InvoiceExtraction = {
          date: rawData.date || '⚠️ MISSING',
          abn: rawData.abn || '⚠️ MISSING',
          amount_inc_gst: rawData.amount_inc_gst || rawData.total_amount || '⚠️ MISSING',
          gst: rawData.gst || rawData.gst_amount || '⚠️ MISSING',
          description: rawData.description || '⚠️ MISSING',
          category: rawData.category || '⚠️ MISSING',
        }

        // Ensure amount and GST are formatted as strings with $ sign
        if (typeof invoiceData.amount_inc_gst === 'number') {
          invoiceData.amount_inc_gst = `$${invoiceData.amount_inc_gst.toFixed(2)}`
        } else if (invoiceData.amount_inc_gst && !invoiceData.amount_inc_gst.toString().startsWith('$')) {
          const num = parseFloat(invoiceData.amount_inc_gst.toString())
          if (!isNaN(num)) {
            invoiceData.amount_inc_gst = `$${num.toFixed(2)}`
          }
        }

        if (typeof invoiceData.gst === 'number') {
          invoiceData.gst = `$${invoiceData.gst.toFixed(2)}`
        } else if (invoiceData.gst && !invoiceData.gst.toString().startsWith('$')) {
          const num = parseFloat(invoiceData.gst.toString())
          if (!isNaN(num)) {
            invoiceData.gst = `$${num.toFixed(2)}`
          }
        }

        return {
          status: 'success',
          file: path.basename(imagePath),
          data: invoiceData as any,
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
