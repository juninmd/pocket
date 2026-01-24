import os
import json
from playwright.sync_api import sync_playwright

MOCK_ITEMS = [
    {
        "id": "1",
        "url": "https://example.com/article1",
        "title": "Example Article 1",
        "excerpt": "This is a summary of the first article.",
        "imageUrl": "https://via.placeholder.com/300x160",
        "status": "unread",
        "isFavorite": False,
        "type": "article",
        "tags": ["tech", "news"],
        "savedAt": "2023-10-27T10:00:00Z",
        "estimatedReadTime": 5,
        "siteName": "Example Site"
    },
    {
        "id": "2",
        "url": "https://example.com/article2",
        "title": "Example Article 2",
        "excerpt": "Another interesting article about something else.",
        "imageUrl": "",
        "status": "archived",
        "isFavorite": True,
        "type": "article",
        "tags": ["science"],
        "savedAt": "2023-10-26T10:00:00Z",
        "estimatedReadTime": 8,
        "siteName": "Science Daily"
    }
]

def run(playwright):
    browser = playwright.firefox.launch(headless=True)
    page = browser.new_page()

    cwd = os.getcwd()
    # Ensure correct path to dist
    dashboard_path = f"file://{cwd}/firefox-pocket-extension/dist/dashboard.html"

    mock_items_json = json.dumps(MOCK_ITEMS)

    page.add_init_script(f"""
        window.browser = {{
            runtime: {{
                id: 'mock-extension-id',
                sendMessage: async (message) => {{
                    console.log('sendMessage:', message);
                    if (message.action === 'getLinks') {{
                        return {{ items: {mock_items_json} }};
                    }}
                    return {{}};
                }},
                onMessage: {{
                    addListener: () => {{}}
                }}
            }},
            storage: {{
                local: {{
                    get: async () => ({{}}),
                    set: async () => {{}}
                }}
            }}
        }};
        window.chrome = window.browser;
    """)

    print(f"Navigating to {dashboard_path}")
    page.goto(dashboard_path)

    # Wait for the card to appear
    try:
        page.wait_for_selector(".card", timeout=5000)
        # Take screenshot
        screenshot_path = os.path.join(cwd, "verification", "dashboard_screenshot.png")
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as p:
        run(p)
