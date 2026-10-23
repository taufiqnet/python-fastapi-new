import json

COLLECTION_FILE = "Business Profile API.postman_collection.json"
MD_FILE = "Business Profile API.postman_collection.md"

def generate_markdown():
    with open(COLLECTION_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    lines = []
    lines.append("# Business Profile API — Postman Collection Documentation\n")
    lines.append(f"> **Postman Collection:** `{data.get('info', {}).get('name', 'Business Profile API')}`  \n")
    lines.append(f"> **Schema:** `{data.get('info', {}).get('schema', '')}`  \n")
    lines.append(f"> **Description:** {data.get('info', {}).get('description', '')}\n")
    lines.append("---\n")

    lines.append("## Environment & Collection Variables\n")
    lines.append("| Variable Key | Default / Sample Value | Description |")
    lines.append("|---|---|---|")
    lines.append("| `base_url` | `http://localhost:8000` | Target API gateway or backend instance |")
    lines.append("| `token` | `eyJhbGciOi...` | Bearer JWT access token obtained via `/auth/login` |")
    lines.append("| `business_id` | `1` | Multi-tenant tenant identifier |")
    for v in data.get("variable", []):
        k = v.get("key")
        if k not in ("base_url", "token", "business_id"):
            val = v.get("value") or "—"
            lines.append(f"| `{k}` | `{val}` | Auto-populated ID from creation requests |")
    lines.append("\n---\n")

    lines.append("## Authentication & Header Standard\n")
    lines.append("All authenticated endpoints require the standard `Authorization` header:\n")
    lines.append("```http")
    lines.append("Authorization: Bearer {{token}}")
    lines.append("Content-Type: application/json")
    lines.append("```\n")
    lines.append("Tenant scoping is automatically resolved via the user's JWT claims and validated against `business_id`.\n")
    lines.append("\n---\n")

    def process_folder(folder, level=2):
        folder_name = folder.get("name", "Folder")
        heading = "#" * level
        lines.append(f"\n{heading} {folder_name}\n")
        
        items = folder.get("item", [])
        subfolders = [x for x in items if "item" in x]
        endpoints = [x for x in items if "request" in x]

        for ep in endpoints:
            ep_name = ep.get("name", "Request")
            req = ep.get("request", {})
            method = req.get("method", "GET")
            url_obj = req.get("url", {})
            raw_url = url_obj.get("raw", "") if isinstance(url_obj, dict) else str(url_obj)
            desc = req.get("description", "")

            lines.append(f"### `{method}` {ep_name}\n")
            lines.append(f"- **URL:** `{raw_url}`")
            lines.append(f"- **Method:** `{method}`")
            if desc:
                lines.append(f"- **Summary:** {desc}")

            # Headers
            headers = req.get("header", [])
            if headers:
                h_strs = [f"`{h.get('key')}: {h.get('value')}`" for h in headers if h.get("key")]
                lines.append(f"- **Headers:** {', '.join(h_strs)}")

            # Query params
            query = url_obj.get("query", []) if isinstance(url_obj, dict) else []
            if query:
                lines.append("- **Query Parameters:**")
                for q in query:
                    lines.append(f"  - `{q.get('key')}`: `{q.get('value')}`")

            # Request Body
            body = req.get("body", {})
            if body.get("mode") == "raw" and body.get("raw"):
                lines.append("\n**Request Body (JSON):**")
                lines.append("```json")
                lines.append(body.get("raw").strip())
                lines.append("```\n")
            elif body.get("mode") == "formdata":
                lines.append("\n**Request Body (Multipart Form-Data):**")
                for fd in body.get("formdata", []):
                    lines.append(f"- `{fd.get('key')}`: `({fd.get('type')})`")
                lines.append("")

            # Tests / Variable extraction
            events = ep.get("event", [])
            for ev in events:
                if ev.get("listen") == "test":
                    script_lines = ev.get("script", {}).get("exec", [])
                    var_setters = [l for l in script_lines if "collectionVariables.set" in l]
                    if var_setters:
                        lines.append(f"- **Collection Variable Hook:** `{var_setters[0].strip()}`")

            lines.append("\n---\n")

        for sf in subfolders:
            process_folder(sf, level=level + 1)

    for top_item in data.get("item", []):
        process_folder(top_item, level=2)

    with open(MD_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Generated {MD_FILE} successfully.")

if __name__ == "__main__":
    generate_markdown()
