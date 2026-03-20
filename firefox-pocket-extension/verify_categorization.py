from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Debug console
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda err: print(f"Page Error: {err}"))

        # Mock WebExtension API
        page.add_init_script("""
            const mockRuntime = {
                id: 'mock-extension-id',
                sendMessage: async (msg) => {
                    console.log('sendMessage', msg);
                    if (msg.action === 'getLinks') {
                        return { items: [
                            {
                                id: '1', title: 'React Documentation', url: 'https://react.dev',
                                tags: ['dev', 'frontend'], aiFolder: 'Tech/Web',
                                status: 'unread',
                                isFavorite: false,
                                savedAt: new Date().toISOString()
                            },
                            {
                                id: '2', title: 'TypeScript Handbook', url: 'https://typescriptlang.org',
                                tags: ['dev', 'ts'], aiFolder: 'Tech/Web',
                                status: 'unread',
                                isFavorite: false,
                                savedAt: new Date().toISOString()
                            }
                        ]};
                    }
                    return {};
                },
                onMessage: {
                    addListener: () => {},
                    removeListener: () => {}
                },
                getURL: (path) => path
            };

            const mockStorage = {
                local: {
                    get: async () => ({ geminiApiKey: 'mock-key' }),
                    set: async () => {}
                }
            };

            window.browser = {
                runtime: mockRuntime,
                storage: mockStorage,
                tabs: { query: async () => [] }
            };
            window.chrome = window.browser;
        """)

        # Build path
        path = os.path.abspath("firefox-pocket-extension/dist/dashboard.html")
        page.goto(f"file://{path}")

        # Verify Dashboard Loaded
        try:
            page.wait_for_selector("text=Minha Lista", timeout=5000)

            # Go to Collections
            page.click("text=Coleções")

            # Verify Folder structure UI
            page.wait_for_selector("text=Tech")
            page.wait_for_selector("text=#dev")

            # Take screenshot
            os.makedirs("verification", exist_ok=True)
            page.screenshot(path="verification/categorization.png")
            print("Verification screenshot saved.")

        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")

        browser.close()

if __name__ == "__main__":
    run()
