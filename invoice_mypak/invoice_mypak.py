import reflex as rx
import csv
import io
import uuid
import sys
import os

# Add parent directory to path to import invoice_extractor
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from invoice_extractor import extract_invoice_data


class ImageState(rx.State):
    images: list[dict] = []
    processing_files: list[dict] = []
    is_uploading: bool = False
    show_image_modal: bool = False
    current_image_url: str = ""

    @rx.event
    async def handle_upload(self, files: list[rx.UploadFile]):
        import asyncio

        self.is_uploading = True
        self.processing_files = [{"name": f.filename, "status": "queued"} for f in files]
        yield

        # Process files concurrently (up to 3 at a time)
        async def process_single_file(idx: int, file):
            # Save the file
            data = await file.read()
            unique_name = f"{uuid.uuid4().hex[:8]}_{file.name}"
            path = rx.get_upload_dir() / unique_name

            with path.open("wb") as f:
                f.write(data)

            # Extract invoice data with AI
            extraction_result = await extract_invoice_data(str(path))

            invoice_data = {}
            if extraction_result["status"] == "success":
                invoice_data = extraction_result.get("data", {})
            else:
                invoice_data = {"error": extraction_result.get("message", "Extraction failed")}

            return {
                "idx": idx,
                "unique_name": unique_name,
                "original_name": file.name,
                "size_kb": round(len(data) / 1024, 2),
                "invoice_data": invoice_data,
                "success": extraction_result["status"] == "success",
            }

        # Process in batches of 3
        for i in range(0, len(files), 3):
            batch = files[i:i+3]
            batch_indices = range(i, min(i+3, len(files)))

            # Mark batch as uploading
            for idx in batch_indices:
                self.processing_files[idx]["status"] = "uploading"
            yield

            # Process batch concurrently
            tasks = [process_single_file(idx, file) for idx, file in zip(batch_indices, batch)]
            results = await asyncio.gather(*tasks)

            # Mark as extracting and update results
            for result in results:
                idx = result["idx"]
                self.processing_files[idx]["status"] = "extracting"
            yield

            # Add results to images
            for result in results:
                idx = result["idx"]
                invoice_data = result["invoice_data"]

                self.images.append({
                    "id": len(self.images) + 1,
                    "filename": result["unique_name"],
                    "original_name": result["original_name"],
                    "size_kb": result["size_kb"],
                    "date": invoice_data.get("date", ""),
                    "abn": invoice_data.get("abn", ""),
                    "amount_inc_gst": invoice_data.get("amount_inc_gst", ""),
                    "gst": invoice_data.get("gst", ""),
                    "description": invoice_data.get("description", ""),
                    "category": invoice_data.get("category", ""),
                })

                self.processing_files[idx]["status"] = "done" if result["success"] else "error"

            yield

        # Clear processing list
        self.is_uploading = False
        self.processing_files = []
        yield

    @rx.event
    def open_image(self, image_url: str):
        self.current_image_url = image_url
        self.show_image_modal = True

    @rx.event
    def close_image_modal(self):
        self.show_image_modal = False
        self.current_image_url = ""

    @rx.event
    def update_field(self, idx: int, field: str, value: str):
        self.images[idx][field] = value

    @rx.event
    def delete_image(self, idx: int):
        # Delete the actual file from disk
        if idx < len(self.images):
            filename = self.images[idx]["filename"]
            file_path = rx.get_upload_dir() / filename
            if file_path.exists():
                file_path.unlink()

        self.images.pop(idx)

    @rx.event
    def clear_all_images(self):
        import shutil

        # Delete all uploaded files from disk
        upload_dir = rx.get_upload_dir()
        if upload_dir.exists():
            shutil.rmtree(upload_dir)
            upload_dir.mkdir(parents=True, exist_ok=True)

        self.images = []
        yield rx.toast("All images and files deleted from server!", duration=2000)

    def download_csv(self):
        if not self.images:
            return rx.toast("No data to download")

        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "id", "original_name", "date", "abn", "amount_inc_gst",
            "gst", "description", "category", "size_kb"
        ])
        writer.writeheader()
        for img in self.images:
            writer.writerow({
                "id": img["id"],
                "original_name": img["original_name"],
                "date": img.get("date", ""),
                "abn": img.get("abn", ""),
                "amount_inc_gst": img.get("amount_inc_gst", ""),
                "gst": img.get("gst", ""),
                "description": img.get("description", ""),
                "category": img.get("category", ""),
                "size_kb": img["size_kb"],
            })

        csv_data = output.getvalue()
        output.close()

        return rx.download(data=csv_data, filename="invoice_data.csv")


def image_row(img: dict, idx: int):
    return rx.table.row(
        rx.table.cell(img["id"]),
        rx.table.cell(
            rx.image(
                src=rx.get_upload_url(img["filename"]),
                width="60px",
                height="60px",
                object_fit="cover",
                border_radius="4px",
                cursor="pointer",
                on_click=ImageState.open_image(rx.get_upload_url(img["filename"])),
                _hover={"opacity": 0.8},
            )
        ),
        rx.table.cell(
            rx.input(
                value=img.get("date", ""),
                on_change=lambda val: ImageState.update_field(idx, "date", val),
                width="100%",
                placeholder="DD/MM/YYYY",
            )
        ),
        rx.table.cell(
            rx.input(
                value=img.get("abn", ""),
                on_change=lambda val: ImageState.update_field(idx, "abn", val),
                width="100%",
                placeholder="ABN",
            )
        ),
        rx.table.cell(
            rx.input(
                value=img.get("amount_inc_gst", ""),
                on_change=lambda val: ImageState.update_field(idx, "amount_inc_gst", val),
                width="100%",
                placeholder="$0.00",
            )
        ),
        rx.table.cell(
            rx.input(
                value=img.get("gst", ""),
                on_change=lambda val: ImageState.update_field(idx, "gst", val),
                width="100%",
                placeholder="$0.00",
            )
        ),
        rx.table.cell(
            rx.input(
                value=img.get("description", ""),
                on_change=lambda val: ImageState.update_field(idx, "description", val),
                width="100%",
                placeholder="Description",
            )
        ),
        rx.table.cell(
            rx.input(
                value=img.get("category", ""),
                on_change=lambda val: ImageState.update_field(idx, "category", val),
                width="100%",
                placeholder="Category",
            )
        ),
        rx.table.cell(
            rx.button(
                rx.icon("trash-2", size=16),
                on_click=ImageState.delete_image(idx),
                variant="ghost",
                color_scheme="red",
                size="1",
            )
        ),
    )


def index():
    return rx.container(
        rx.vstack(
            rx.heading("📸 Invoice Image Manager", size="8"),

            # Upload section
            rx.card(
                rx.upload(
                    rx.vstack(
                        rx.icon("upload", size=40),
                        rx.text("Drop invoices here or click to browse", size="4", weight="bold"),
                        rx.text("Auto-processes with AI instantly", size="2", color="gray"),
                        rx.text("Supports: PNG, JPG, GIF, WEBP", size="1", color="gray"),
                        spacing="2",
                        align="center",
                    ),
                    id="upload",
                    accept={"image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"]},
                    multiple=True,
                    on_drop=ImageState.handle_upload(rx.upload_files("upload")),
                    border="2px dashed var(--accent-7)",
                    padding="4em",
                    border_radius="8px",
                    width="100%",
                ),
            ),

            # Processing status
            rx.cond(
                ImageState.processing_files.length() > 0,
                rx.card(
                    rx.vstack(
                        rx.heading("🤖 AI Processing Invoices...", size="4"),
                        rx.foreach(
                            ImageState.processing_files,
                            lambda f: rx.hstack(
                                rx.cond(
                                    f["status"] == "queued",
                                    rx.icon("clock", size=18, color="gray"),
                                ),
                                rx.cond(
                                    f["status"] == "uploading",
                                    rx.spinner(size="2"),
                                ),
                                rx.cond(
                                    f["status"] == "extracting",
                                    rx.spinner(size="2"),
                                ),
                                rx.cond(
                                    f["status"] == "done",
                                    rx.icon("circle-check", size=18, color="green"),
                                ),
                                rx.cond(
                                    f["status"] == "error",
                                    rx.icon("circle-x", size=18, color="red"),
                                ),
                                rx.text(f["name"], size="2", weight="medium"),
                                rx.cond(
                                    f["status"] == "uploading",
                                    rx.badge("Uploading...", color_scheme="blue", variant="soft"),
                                ),
                                rx.cond(
                                    f["status"] == "extracting",
                                    rx.badge("🧠 Extracting with AI...", color_scheme="purple", variant="soft"),
                                ),
                                rx.cond(
                                    f["status"] == "done",
                                    rx.badge("✓ Done", color_scheme="green", variant="soft"),
                                ),
                                rx.cond(
                                    f["status"] == "error",
                                    rx.badge("Failed", color_scheme="red", variant="soft"),
                                ),
                                spacing="2",
                                align="center",
                            ),
                        ),
                        spacing="2",
                        width="100%",
                    ),
                    width="100%",
                ),
            ),

            # Table header and export
            rx.hstack(
                rx.heading("📋 Invoice Data", size="6"),
                rx.spacer(),
                rx.text(
                    f"{ImageState.images.length()} images",
                    size="2",
                    color="gray",
                ),
                rx.dialog.root(
                    rx.dialog.trigger(
                        rx.button(
                            rx.icon("trash-2", size=18),
                            "Clear All",
                            variant="soft",
                            color_scheme="red",
                            disabled=ImageState.images.length() == 0,
                        ),
                    ),
                    rx.dialog.content(
                        rx.dialog.title("Clear All Images?"),
                        rx.dialog.description(
                            "This will permanently delete all uploaded files from the server and clear all extracted data. You'll need to re-upload to process again.",
                            size="2",
                        ),
                        rx.flex(
                            rx.dialog.close(
                                rx.button("Cancel", variant="soft", color_scheme="gray"),
                            ),
                            rx.dialog.close(
                                rx.button(
                                    "Clear All",
                                    on_click=ImageState.clear_all_images,
                                    color_scheme="red",
                                ),
                            ),
                            spacing="3",
                            justify="end",
                        ),
                    ),
                ),
                rx.button(
                    rx.icon("download", size=18),
                    "Export CSV",
                    on_click=ImageState.download_csv,
                    variant="soft",
                    disabled=ImageState.images.length() == 0,
                ),
                spacing="3",
                width="100%",
                align="center",
            ),

            # Editable table
            rx.cond(
                ImageState.images.length() > 0,
                rx.table.root(
                    rx.table.header(
                        rx.table.row(
                            rx.table.column_header_cell("ID"),
                            rx.table.column_header_cell("Preview"),
                            rx.table.column_header_cell("Date"),
                            rx.table.column_header_cell("ABN"),
                            rx.table.column_header_cell("Amount"),
                            rx.table.column_header_cell("GST"),
                            rx.table.column_header_cell("Description"),
                            rx.table.column_header_cell("Category"),
                            rx.table.column_header_cell(""),
                        ),
                    ),
                    rx.table.body(
                        rx.foreach(
                            ImageState.images,
                            lambda img, idx: image_row(img, idx),
                        )
                    ),
                    width="100%",
                    variant="surface",
                ),
                rx.card(
                    rx.text("No images uploaded yet", color="gray", align="center"),
                    width="100%",
                ),
            ),

            # Image grid preview
            rx.cond(
                ImageState.images.length() > 0,
                rx.vstack(
                    rx.heading("Preview Gallery", size="6"),
                    rx.grid(
                        rx.foreach(
                            ImageState.images,
                            lambda img: rx.card(
                                rx.inset(
                                    rx.image(
                                        src=rx.get_upload_url(img["filename"]),
                                        width="100%",
                                        height="200px",
                                        object_fit="cover",
                                        cursor="pointer",
                                        on_click=ImageState.open_image(rx.get_upload_url(img["filename"])),
                                        _hover={"opacity": 0.9},
                                    ),
                                    side="top",
                                ),
                                rx.vstack(
                                    rx.text(img["original_name"], weight="bold", size="2"),
                                    rx.text(f"{img['size_kb']} KB", size="1", color="gray"),
                                    rx.cond(
                                        img["description"] != "",
                                        rx.text(img["description"], size="1"),
                                    ),
                                    spacing="1",
                                    align="start",
                                ),
                            ),
                        ),
                        columns=rx.breakpoints(initial="1", xs="2", md="3", lg="4"),
                        spacing="4",
                        width="100%",
                    ),
                    spacing="3",
                    width="100%",
                ),
            ),

            # Image viewer modal
            rx.dialog.root(
                rx.dialog.content(
                    rx.vstack(
                        rx.image(
                            src=ImageState.current_image_url,
                            max_width="90vw",
                            max_height="90vh",
                            object_fit="contain",
                        ),
                        rx.button(
                            "Close",
                            on_click=ImageState.close_image_modal,
                            size="3",
                        ),
                        spacing="4",
                        align="center",
                    ),
                    max_width="95vw",
                ),
                open=ImageState.show_image_modal,
            ),

            spacing="6",
            padding="4",
            width="100%",
        ),
        size="4",
    )


app = rx.App()
app.add_page(index)
