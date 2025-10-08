# 📸 Invoice Image Manager

AI-powered invoice processing tool that extracts data from invoice images using Claude Vision API. Built with Next.js 15 + TypeScript for a modern, reactive UI.

## ✨ Features

- 🚀 **Drag & Drop Upload** - Auto-processes invoices instantly
- 🤖 **AI Extraction** - Uses Claude Vision to extract invoice data
- 📊 **Editable Table** - Click to edit any extracted field
- 🔍 **Image Preview** - Click images to view full-size
- 💾 **CSV Export** - Download all data to Excel-compatible CSV
- ⚡ **Parallel Processing** - Processes up to 3 invoices concurrently
- 🗑️ **Clean UI** - Delete individual or all images

## 📋 Extracted Data

- **Date** (DD/MM/YYYY)
- **ABN** (Australian Business Number)
- **Amount** (inc. GST)
- **GST** (tax amount)
- **Description** (items purchased)
- **Category** (Fuel, Food, Office, etc.)

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+ and npm
- Anthropic API key

### Setup
```bash
git clone <repo-url>
cd invoice-mypak
npm install
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY
```

### Run
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Then open http://localhost:3000

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
invoice-mypak/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── upload/        # File upload endpoint
│   │   ├── process/       # Invoice extraction endpoint
│   │   ├── export/        # CSV export endpoint
│   │   └── delete/        # File deletion endpoint
│   ├── page.tsx           # Main UI page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/                   # Utilities
│   ├── extract-invoice.ts # Claude extraction logic
│   └── types.ts           # TypeScript types
├── public/                # Static files
│   └── uploaded_files/    # Uploaded invoices
├── package.json           # Node dependencies
└── .env.example           # Example environment config
```

## 🌍 Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)
- `ANTHROPIC_MODEL` - Model to use (default: `claude-3-5-sonnet-latest`)
- `ANTHROPIC_BASE_URL` - Optional custom base URL; leave unset to use Anthropic’s official API

## 💡 Usage Tips

1. Drop multiple invoices at once for batch processing
2. Click any image to view full-size
3. Edit extracted data directly in the table
4. Export to CSV anytime for Excel
5. Clear All to remove everything and free disk space

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Claude Vision API (Anthropic SDK)

## 📝 License

MIT
