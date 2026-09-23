#!/usr/bin/env python3
"""Скриншоты green-api-chat с замоканным GREEN-API (route interception)."""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:5173"
OUT = "docs"

MOCK_CRED = {"idInstance": "7103894999", "apiTokenInstance": "tok"}

async def route_mock(page):
    async def handler(route):
        url = route.request.url
        if "getStateInstance" in url:
            await route.fulfill(json={"stateInstance": "authorized"})
        elif "receiveNotification" in url:
            await route.fulfill(json=None, status=204, body="null")
        elif route.request.method == "POST" and "/sendMessage" in url:
            await route.fulfill(json={"idMessage": f"mock-{id(route.request)}"})
        else:
            await route.continue_()
    await page.route("**/waInstance**", handler)

async def seed_chat(page):
    # login
    await page.goto(BASE)
    await page.fill("input >> nth=0", MOCK_CRED["idInstance"])
    await page.fill("input >> nth=1", MOCK_CRED["apiTokenInstance"])
    await page.click("button:has-text('Войти')")
    await page.wait_for_selector(".sidebar")
    # create chat
    await page.fill(".new-chat input", "+79001234567")
    await page.click(".new-chat button")
    await page.wait_for_selector(".chat-header")
    # fill conversation via page.evaluate dispatching mocked notifications is complex;
    # instead just send two messages through composer (mocked API)
    for txt in ["Привет! Это тестовое задание Green API 👋", "Чат работает через GREEN-API sendMessage"]:
        await page.fill(".composer input", txt)
        await page.click(".composer button")
        await page.wait_for_timeout(300)
    # incoming message: easiest - inject via receiveNotification mock counter
    # simple approach: evaluate DOM? Better: use a queue-based mock below in fill_incoming.

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        # queue of notifications to deliver one per receiveNotification call
        incoming = {
            "count": 0,
        }
        INCOMING = [
            {"receiptId": 1, "body": {
                "typeWebhook": "incomingMessageReceived",
                "idMessage": "in1", "timestamp": 1758600000,
                "typeMessage": "textMessage", "textMessage": "Привет!收到了 咨询 Максим!",
                "chatId": "79001234567@c.us"}},
        ]
        async def handler(route):
            url = route.request.url
            if "getStateInstance" in url:
                await route.fulfill(json={"stateInstance": "authorized"})
            elif "receiveNotification" in url:
                i = incoming["count"]
                incoming["count"] += 1
                payload = INCOMING[i] if i < len(INCOMING) else None
                await route.fulfill(json=payload, headers={"content-type": "application/json"})
            elif "/sendMessage" in url:
                await route.fulfill(json={"idMessage": f"out-{incoming['count']}"})
            else:
                await route.continue_()
        await page.route("**/waInstance**", handler)

        # 1) login screen
        await page.goto(BASE)
        await page.wait_for_selector(".login-card")
        await page.screenshot(path=f"{OUT}/01-login.png")

        # 2) login
        await page.fill("input >> nth=0", MOCK_CRED["idInstance"])
        await page.fill("input >> nth=1", MOCK_CRED["apiTokenInstance"])
        await page.screenshot(path=f"{OUT}/02-login-filled.png")
        await page.click("button:has-text('Войти')")
        await page.wait_for_selector(".sidebar")

        # 3) create chat
        await page.fill(".new-chat input", "+79001234567")
        await page.click(".new-chat button")
        await page.wait_for_selector(".chat-header")

        # 4) send messages
        for txt in ["Привет! Это тестовое задание Green API 👋", "Чат работает через GREEN-API sendMessage"]:
            await page.fill(".composer input", txt)
            await page.click(".composer button")
            await page.wait_for_timeout(300)

        # 5) wait for incoming notification poll (4s interval)
        await page.wait_for_timeout(4600)
        await page.screenshot(path=f"{OUT}/03-chat.png")

        # second chat for list view
        await page.fill(".new-chat input", "89005556677")
        await page.click(".new-chat button")
        await page.wait_for_timeout(200)
        await page.screenshot(path=f"{OUT}/04-chat-list.png")

        await browser.close()
        print("done")

asyncio.run(main())
