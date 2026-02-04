import sys
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

def scan_site(url):
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1920,1080")
    # Stealth Mode
    chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)
    
    result = {
        "title": "",
        "description": "",
        "h1": "",
        "images": [],
        "performance": {},
        "console_errors": []
    }

    try:
        start_time = time.time()
        driver.get(url)
        
        # Wait for potential JS render
        time.sleep(3)
        
        load_time = (time.time() - start_time) * 1000
        result["performance"]["loadTime"] = int(load_time)

        # Extract Data
        result["title"] = driver.title
        try:
            desc_meta = driver.find_element(By.CSS_SELECTOR, "meta[name='description']")
            result["description"] = desc_meta.get_attribute("content")
        except:
            pass

        try:
            h1 = driver.find_element(By.TAG_NAME, "h1")
            result["h1"] = h1.text
        except:
            pass

        # Images
        imgs = driver.find_elements(By.TAG_NAME, "img")
        for img in imgs[:20]: # Top 20 images
            src = img.get_attribute("src")
            alt = img.get_attribute("alt")
            if src:
                result["images"].append({"src": src, "alt": alt or ""})

        # Capture Logs (Requires logging prefs, skipped for simple setup)
        
    except Exception as e:
        result["error"] = str(e)
    finally:
        driver.quit()

    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_url = sys.argv[1]
        scan_site(target_url)
    else:
        print(json.dumps({"error": "No URL provided"}))
