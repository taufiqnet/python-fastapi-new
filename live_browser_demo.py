import time
import os
import sys
import ctypes
import subprocess

# Ensure safe console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Switch thread desktop to the user's physical interactive screen (WinSta0\Default)
u32 = ctypes.windll.user32
hdesk = u32.OpenDesktopW("Default", 0, False, 0x10000000 | 0x01FF)
if hdesk:
    u32.SetThreadDesktop(hdesk)

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def bring_window_to_front():
    """Forces the Chrome window to the absolute front of the user's monitor."""
    try:
        def enum_cb(hwnd, extra):
            if u32.IsWindowVisible(hwnd):
                buf = ctypes.create_unicode_buffer(512)
                u32.GetWindowTextW(hwnd, buf, 512)
                title = buf.value
                if any(k in title for k in ["ProERP", "SaaS", "Chrome", "কর চালানপত্র", "মূসক"]):
                    u32.ShowWindow(hwnd, 3)  # SW_MAXIMIZE
                    u32.SetForegroundWindow(hwnd)
                    u32.BringWindowToTop(hwnd)
            return True
        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
        u32.EnumWindows(WNDENUMPROC(enum_cb), 0)
    except Exception:
        pass

class VisibleService(Service):
    """Custom Service ensuring chromedriver & Chrome launch directly on the user's visible desktop."""
    def _start_process(self, path):
        cmd = [path] + self.command_line_args()
        si = subprocess.STARTUPINFO()
        si.lpDesktop = r"WinSta0\Default"
        si.dwFlags = subprocess.CREATE_NEW_CONSOLE | subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = subprocess.SW_HIDE
        self.process = subprocess.Popen(
            cmd,
            env=self.env,
            stdin=subprocess.PIPE,
            stdout=self.log_output,
            stderr=self.log_output,
            startupinfo=si,
            **self.popen_kw,
        )

def run_live_demonstration():
    print("=" * 72)
    print("[PROERP] LIVE ON-SCREEN CHROME DEMONSTRATION: MUSHAK 6.3 & 6.5")
    print("User Account: test@test.com  |  Role: Super Admin")
    print("Target Desktop: WinSta0\\Default (Physical Monitor)")
    print("=" * 72)

    driver_path = r"C:\Users\Asus\.cache\selenium\chromedriver\win64\155.0.8059.84\chromedriver.exe"
    svc = VisibleService(driver_path)

    options = Options()
    options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    options.add_argument(r"--user-data-dir=C:\Users\Asus\AppData\Local\Temp\chrome_live_on_screen")
    options.add_argument("--start-maximized")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--disable-notifications")
    options.add_argument("--disable-popup-blocking")
    # Detach keeps Chrome open on the user's screen after script ends
    options.add_experimental_option("detach", True)

    print("\n>> Launching Google Chrome directly onto your physical screen...")
    driver = webdriver.Chrome(service=svc, options=options)
    wait = WebDriverWait(driver, 15)

    try:
        # STEP 1: LOGIN
        print("\n>> [Step 1/6] Opening Login Page (http://localhost:3000/login)...")
        driver.get("http://localhost:3000/login")
        time.sleep(1)
        bring_window_to_front()
        time.sleep(2)

        print(">> [Step 2/6] Entering credentials on screen for test@test.com...")
        username_input = wait.until(
            EC.visibility_of_element_located((
                By.CSS_SELECTOR,
                "input[placeholder*='admin@example.com'], input[type='text'], input[name='username']"
            ))
        )
        username_input.clear()
        for char in "test@test.com":
            username_input.send_keys(char)
            time.sleep(0.05)

        password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        password_input.clear()
        for char in "123456":
            password_input.send_keys(char)
            time.sleep(0.05)
        time.sleep(1)

        print(">> [Step 3/6] Clicking 'Sign In to Dashboard'...")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_btn.click()

        # Wait for redirect to complete
        time.sleep(3)
        bring_window_to_front()
        print(f"   Authenticated! Current URL: {driver.current_url}")

        # STEP 2: ECOMMERCE ORDER MUSHAK 6.3
        print("\n>> [Step 4/6] Navigating to Ecommerce Orders (http://localhost:3000/ecommerce/orders)...")
        driver.get("http://localhost:3000/ecommerce/orders")
        time.sleep(3)
        bring_window_to_front()

        print("   Locating Commercial Invoice action on order row...")
        invoice_buttons = wait.until(
            EC.presence_of_all_elements_located((
                By.CSS_SELECTOR,
                "button[title*='Commercial Invoice'], button[title*='Print']"
            ))
        )
        if invoice_buttons:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", invoice_buttons[0])
            time.sleep(1)
            driver.execute_script("arguments[0].click();", invoice_buttons[0])
            print("   Commercial Tax Invoice modal opened on screen.")
            time.sleep(2.5)

            # Click Mushak 6.3 button
            print("   Clicking statutory button: 'কর চালানপত্র (মূসক-৬.৩)'...")
            mushak_btn = wait.until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//button[contains(., '6.3') or contains(., '৬.৩') or contains(@title, 'Mushak 6.3')]"
                ))
            )
            driver.execute_script("arguments[0].click();", mushak_btn)
            time.sleep(3)
            bring_window_to_front()

            # Capture screenshot of Mushak 6.3 preview
            order_screenshot = os.path.abspath("mushak_6_3_order_preview.png")
            driver.save_screenshot(order_screenshot)
            print(f"   [DISPLAYED] Statutory NBR Rule 40 Mushak 6.3 Tax Invoice is visible on your screen!")
            print("   (Displaying on screen for 6 seconds for live inspection...)")
            time.sleep(6)

            # Close preview modals
            print("   Closing preview dialog...")
            close_buttons = driver.find_elements(By.CSS_SELECTOR, "button[title='Close']")
            for btn in reversed(close_buttons):
                try:
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(0.5)
                except Exception:
                    pass
            time.sleep(1)

        # STEP 3: FINANCE MUSHAK REGISTRY
        print("\n>> [Step 5/6] Navigating to Finance Mushak 6.3 Registry (http://localhost:3000/finance/mushak)...")
        driver.get("http://localhost:3000/finance/mushak")
        time.sleep(3)
        bring_window_to_front()

        # Demonstrate in-place search filtering
        print("   Demonstrating reactive in-place non-destructive search on screen...")
        search_inputs = driver.find_elements(
            By.CSS_SELECTOR,
            "input[placeholder*='খুঁজুন'], input[placeholder*='Search'], input[type='text']"
        )
        if search_inputs:
            search_input = search_inputs[0]
            search_input.clear()
            for char in "INV":
                search_input.send_keys(char)
                time.sleep(0.12)
            time.sleep(2.5)
            search_input.clear()
            search_input.send_keys(Keys.BACK_SPACE)
            time.sleep(1.5)

        # Open Mushak 6.3 from registry row
        print("   Opening Mushak 6.3 Challan from Finance Registry row...")
        challan_buttons = wait.until(
            EC.presence_of_all_elements_located((
                By.XPATH,
                "//button[contains(., 'চালানপত্র') or contains(., '6.3') or contains(., '৬.৩') or contains(@title, 'Mushak 6.3')]"
            ))
        )
        if challan_buttons:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", challan_buttons[0])
            time.sleep(1)
            driver.execute_script("arguments[0].click();", challan_buttons[0])
            time.sleep(3)
            bring_window_to_front()

            reg_screenshot = os.path.abspath("mushak_6_3_registry_preview.png")
            driver.save_screenshot(reg_screenshot)
            print(f"   [DISPLAYED] Finance Registry Mushak 6.3 Challan is visible on your screen!")
            print("   (Displaying on screen for 6 seconds for live inspection...)")
            time.sleep(6)

            # Close preview modal
            close_buttons = driver.find_elements(By.CSS_SELECTOR, "button[title='Close']")
            for btn in reversed(close_buttons):
                try:
                    driver.execute_script("arguments[0].click();", btn)
                    time.sleep(0.5)
                except Exception:
                    pass
            time.sleep(1)

        # STEP 4: INVENTORY MUSHAK 6.5 TRANSFER CHALAN
        print("\n>> [Step 6/6] Navigating to Stock Transfers (http://localhost:3000/ecommerce/inventory/transfers)...")
        driver.get("http://localhost:3000/ecommerce/inventory/transfers")
        time.sleep(3)
        bring_window_to_front()

        # Look for Mushak 6.5 button
        print("   Opening statutory Mushak 6.5 Stock Transfer Chalan...")
        mushak_65_buttons = driver.find_elements(
            By.XPATH,
            "//button[contains(., '6.5') or contains(., '৬.৫') or contains(@title, 'Mushak 6.5')]"
        )
        if mushak_65_buttons:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", mushak_65_buttons[0])
            time.sleep(1)
            driver.execute_script("arguments[0].click();", mushak_65_buttons[0])
            time.sleep(3)
            bring_window_to_front()

            tr_screenshot = os.path.abspath("mushak_6_5_transfer_preview.png")
            driver.save_screenshot(tr_screenshot)
            print(f"   [DISPLAYED] Statutory Mushak 6.5 Transfer Chalan is visible on your screen!")
            print("   (Displaying on screen for 6 seconds...)")
            time.sleep(6)

        print("\n" + "=" * 72)
        print("[PROERP] LIVE DEMONSTRATION COMPLETE & ACTIVE ON SCREEN!")
        print("Google Chrome is now open and maximized on your display.")
        print("You can interact with the live application directly.")
        print("=" * 72)

    except Exception as e:
        print(f"\n[ERROR] Error during live execution: {e}")
        try:
            driver.save_screenshot(os.path.abspath("demo_error.png"))
        except Exception:
            pass
        raise e

if __name__ == "__main__":
    run_live_demonstration()
