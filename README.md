# ChatGPT Minimap

A Chrome extension that adds a DeepSeek-style message navigator to ChatGPT. Small bars appear on the right edge of the page — one per user message — so you can jump between messages instantly without scrolling.

## Features

- **Nav bars** — A thin bar appears on the right edge for every user message in the conversation, positioned proportionally to where it sits in the scroll height. Click any bar to jump straight to that message.
- **Hover tooltip** — Hovering the bar strip opens a panel listing all your messages with truncated previews. Click any row to scroll to it.
- **Pin messages** — Star any message from the tooltip to pin it. Pinned bars turn gold; pinned messages get a gold left-border highlight in the chat.
- **Flash on jump** — A brief blue outline pulses on the target message when you scroll to it, so you don't lose your place.
- **SPA-aware** — Intercepts ChatGPT's History API so the navigator resets cleanly when you switch conversations.
- **Light/Dark theme** — Follows ChatGPT's own dark mode automatically.
- **No API key required** — Entirely client-side, no external requests.

## Setup

1. Clone or download this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the project folder.
4. Open any ChatGPT conversation — the nav bars appear automatically.

## Usage

- The bars sit on the right edge, clear of the scrollbar.
- Hover over the bar strip to open the message list tooltip.
- Click a bar or a tooltip row to jump to that message.
- Hover a tooltip row and click the star to pin/unpin it.

