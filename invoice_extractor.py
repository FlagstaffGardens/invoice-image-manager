"""
Invoice Data Extraction Tool using Claude Vision API
Extracts: ABN, Amount (incl GST), GST, Description, Category, Date from Australian invoices
"""
import os
import json
import base64
import asyncio
from typing import Dict, List, Any
from pathlib import Path
from dotenv import load_dotenv
import httpx

# Load environment variables
load_dotenv()


def encode_image_to_base64(image_path: str) -> tuple[str, str]:
    """
    Encode image to base64 and determine media type.

    Args:
        image_path: Path to the image file

    Returns:
        Tuple of (base64_string, media_type)
    """
    with open(image_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

    # Determine media type from file extension
    ext = Path(image_path).suffix.lower()
    media_type_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    media_type = media_type_map.get(ext, 'image/jpeg')

    return base64_image, media_type


async def extract_invoice_data(image_path: str) -> Dict[str, Any]:
    """
    Extract invoice data from an image using Claude Vision API.

    Args:
        image_path: Path to the invoice image

    Returns:
        Dictionary containing extracted invoice data
    """
    # Get configuration from environment
    api_key = os.getenv("ANTHROPIC_API_KEY")
    base_url = os.getenv("ANTHROPIC_BASE_URL", "https://20250731.xyz/claude")
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

    if not api_key:
        return {
            "status": "error",
            "message": "ANTHROPIC_API_KEY not found in environment",
            "data": None
        }

    # Encode image
    try:
        base64_image, media_type = encode_image_to_base64(image_path)
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to read image: {str(e)}",
            "data": None
        }

    # System prompt for invoice extraction
    system_prompt = """You are an expert at extracting data from Australian business invoices and receipts.

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
- Use Australian dollar format with $ sign"""

    # User prompt
    user_prompt = """Extract the invoice data from this image and return it in the specified JSON format.

Make sure to:
- Extract the transaction date and format as DD/MM/YYYY
- Find the ABN (usually 11 digits, may be formatted as XX XXX XXX XXX)
- Get the total amount including GST
- Extract or calculate the GST amount
- Summarize what was purchased
- Categorize the expense appropriately

Return ONLY the JSON object, no additional text."""

    try:
        # Prepare request
        api_url = f"{base_url}/v1/messages"
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        payload = {
            "model": model,
            "max_tokens": 1024,
            "temperature": 0.2,  # Low temperature for more consistent extraction
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": user_prompt
                        }
                    ]
                }
            ]
        }

        # Make request
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(api_url, headers=headers, json=payload)
            response.raise_for_status()
            result = response.json()

            # Extract text from response
            content = result.get("content", [])
            if content and len(content) > 0:
                text_content = content[0].get("text", "")

                # Try to parse as JSON
                try:
                    # Remove markdown code blocks if present
                    if "```json" in text_content:
                        text_content = text_content.split("```json")[1].split("```")[0].strip()
                    elif "```" in text_content:
                        text_content = text_content.split("```")[1].split("```")[0].strip()

                    invoice_data = json.loads(text_content)

                    return {
                        "status": "success",
                        "file": os.path.basename(image_path),
                        "data": invoice_data
                    }
                except json.JSONDecodeError:
                    return {
                        "status": "error",
                        "message": "Failed to parse JSON response",
                        "raw_response": text_content,
                        "file": os.path.basename(image_path)
                    }
            else:
                return {
                    "status": "error",
                    "message": "No content in response",
                    "file": os.path.basename(image_path)
                }

    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": f"API request failed: {str(e)}",
            "details": traceback.format_exc(),
            "file": os.path.basename(image_path)
        }


async def process_invoices(invoice_paths: List[str], max_concurrent: int = 3) -> List[Dict[str, Any]]:
    """
    Process multiple invoice images and extract data from each with concurrent API calls.

    Args:
        invoice_paths: List of paths to invoice images
        max_concurrent: Maximum number of concurrent API calls (default: 3)

    Returns:
        List of extraction results
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    results = []

    async def process_single_invoice(path: str, index: int) -> Dict[str, Any]:
        async with semaphore:
            print(f"\n{'='*60}")
            print(f"Processing invoice {index}/{len(invoice_paths)}: {os.path.basename(path)}")
            print('='*60)

            result = await extract_invoice_data(path)

            # Print result
            if result["status"] == "success":
                print("✅ Extraction successful!")
                print("\nExtracted Data:")
                data = result["data"]
                print(f"  Date:             {data.get('date', 'N/A')}")
                print(f"  ABN:              {data.get('abn', 'N/A')}")
                print(f"  Amount (inc GST): {data.get('amount_inc_gst', 'N/A')}")
                print(f"  GST:              {data.get('gst', 'N/A')}")
                print(f"  Description:      {data.get('description', 'N/A')}")
                print(f"  Category:         {data.get('category', 'N/A')}")
            else:
                print(f"❌ Extraction failed: {result.get('message', 'Unknown error')}")

            return result

    # Create tasks for all invoices
    tasks = [process_single_invoice(path, i + 1) for i, path in enumerate(invoice_paths)]

    # Run all tasks concurrently (limited by semaphore)
    results = await asyncio.gather(*tasks)

    return list(results)


async def main():
    """Main function to test invoice extraction"""
    # Process ALL invoices from the Expenses folder
    expenses_dir = "/Users/ethan/temp/ClaudeAgentSDK/Expenses"

    # Get ALL invoice images
    all_images = sorted(Path(expenses_dir).glob("*.jpg"))
    invoice_paths = [str(img) for img in all_images]

    if not invoice_paths:
        print("No invoice images found in Expenses folder!")
        return

    print(f"Found {len(invoice_paths)} invoices to process")
    print(f"Processing with max 3 concurrent API calls...")

    # Process invoices with max 3 concurrent API calls
    results = await process_invoices(invoice_paths, max_concurrent=3)

    # Save results to JSON file
    output_file = "invoice_extraction_results.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*60}")
    print(f"✅ All {len(results)} invoices processed!")
    print(f"✅ Results saved to: {output_file}")
    print('='*60)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
