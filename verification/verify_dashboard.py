from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock WebExtension API
        page.add_init_script("""
            window.browser = {
                runtime: {
                    id: 'mock-id',
                    sendMessage: async (msg) => {
                        console.log("Message received:", msg);
                        if (msg.action === 'getLinks') {
                            return {
                                items: [
                                    {
                                        id: '1',
                                        url: 'https://example.com',
                                        title: 'Example Article No Image',
                                        status: 'unread',
                                        isFavorite: false,
                                        savedAt: new Date().toISOString(),
                                        imageUrl: null,
                                        siteName: 'Example Site',
                                        estimatedReadTime: 5
                                    },
                                    {
                                        id: '2',
                                        url: 'https://google.com',
                                        title: 'Google',
                                        status: 'unread',
                                        isFavorite: true,
                                        savedAt: new Date().toISOString(),
                                        imageUrl: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
                                        siteName: 'Google',
                                        estimatedReadTime: 1
                                    }
                                ]
                            };
                        }
                        return {};
                    },
                    onMessage: {
                        addListener: () => {}
                    }
                },
                storage: {
                    local: {
                        get: async () => ({ geminiApiKey: 'test-key' }),
                        set: async () => {}
                    }
                }
            };
            window.chrome = window.browser;
        """)

        # Get absolute path to dashboard.html
        cwd = os.getcwd()
        url = f"file://{cwd}/firefox-pocket-extension/dist/dashboard.html"

        print(f"Navigating to {url}")
        page.goto(url)

        # Wait for items to load
        try:
            page.wait_for_selector('.card', timeout=5000)
        except Exception as e:
            print("Timeout waiting for .card")
            page.screenshot(path='verification/error.png')
            print(page.content())
            raise e

        # Take screenshot
        os.makedirs('verification', exist_ok=True)
        page.screenshot(path='verification/dashboard.png', full_page=True)

        browser.close()

if __name__ == '__main__':
    run()
