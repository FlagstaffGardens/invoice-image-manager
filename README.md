# 📸 Invoice Image Manager

AI-powered invoice processing tool that extracts data from invoice images using Claude Vision API. Built with Reflex for a modern, reactive UI.

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

## 🚀 Quick Start with Docker

### Prerequisites
- Docker Desktop installed and running
- Get API key from Anthropic

### Local Docker Setup

1. **Start Docker Desktop first!**
   - Open Docker Desktop app
   - Wait for it to start (icon in menu bar)

2. **Clone and setup:**
```bash
git clone <repo-url>
cd invoice-mypak
cp .env.example .env
```

3. **Edit `.env` with your API key:**
```env
ANTHROPIC_BASE_URL=https://20250731.xyz/claude
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_API_KEY=cr_your_key_here
```

4. **Build and run:**
```bash
# Easy way - use test script
./test-docker.sh

# Or manually (use LOCAL docker-compose file)
docker-compose -f docker-compose.local.yml up --build -d
```

5. **Open browser at localhost:3000:**
```
http://localhost:3000
```

**Note:** For local testing, use `docker-compose.local.yml` which exposes ports. The main `docker-compose.yml` is configured for Dokploy's Traefik reverse proxy.

### 🚢 Deploy to Dokploy

1. **In Dokploy dashboard:**
   - Create new app → Docker Compose
   - Connect your Git repository
   - Set build path to `/`

2. **Add environment variables:**
   ```
   ANTHROPIC_API_KEY=your_key_here
   ANTHROPIC_BASE_URL=https://20250731.xyz/claude
   ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
   ```

3. **Deploy settings:**
   - Port: `3000` (main app)
   - Health check path: `/`

4. **Click Deploy!**

## 🛠️ Local Development

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run app
reflex run
```

## 📁 Project Structure

```
invoice-mypak/
├── invoice_mypak/          # Main app code
│   └── invoice_mypak.py    # UI and state management
├── invoice_extractor.py    # AI extraction logic
├── rxconfig.py            # Reflex config
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker image
├── docker-compose.yml    # Docker orchestration
└── .env.example         # Example environment config
```

## 🌍 Environment Variables

- `ANTHROPIC_BASE_URL` - API endpoint (default: https://20250731.xyz/claude)
- `ANTHROPIC_MODEL` - Model to use (default: claude-sonnet-4-5-20250929)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)

## 🐳 Docker Commands

**For Local Development:**
```bash
# Start (localhost:3000)
docker-compose -f docker-compose.local.yml up -d

# Stop
docker-compose -f docker-compose.local.yml down

# View logs
docker-compose -f docker-compose.local.yml logs -f

# Rebuild after changes
docker-compose -f docker-compose.local.yml up --build -d
```

**For Dokploy Deployment:**
- Use main `docker-compose.yml` (configured for Traefik)
- Dokploy handles port mapping automatically
- No manual port configuration needed

## 💡 Usage Tips

1. Drop multiple invoices at once for batch processing
2. Click any image to view full-size
3. Edit extracted data directly in the table
4. Export to CSV anytime for Excel
5. Clear All to remove everything and free disk space

## 🔧 Tech Stack

- **Backend**: Python 3.13, Reflex
- **AI**: Claude Vision API (Anthropic)
- **Frontend**: React (via Reflex)
- **Deployment**: Docker + Docker Compose

## 📝 License

MIT
