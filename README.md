# Fractal Reader

A Chrome extension that transforms any text selection into a gateway for deep intellectual exploration using Claude AI.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue) ![Claude AI](https://img.shields.io/badge/Claude-AI-purple) ![Shadow DOM](https://img.shields.io/badge/Shadow_DOM-Isolated-green)

## The Idea

When reading an article and encountering an interesting idea, one of two things usually happens: either we get distracted by Google and lose our reading flow, or we bookmark it "for later" and forget.

**Fractal Reader** solves this — it turns any highlighted text into an entry point for deep research without leaving the reading context.

## How It Works

1. **Select text** → a magnifying glass button appears
2. **Click** → get instant analysis across 4 dimensions:
   - **Dialectics** — what opposing viewpoints and schools of thought exist
   - **References** — what to read to go deeper
   - **Connections** — where similar patterns appear in other fields (analogical transfer)
   - **Questions** — reflective questions to apply this to your own experience

3. **Arrow button ↗ next to each item** — one click opens a Claude dialog to discuss that specific concept, with full article context included

## The Metaphor

The name "Fractal Reader" reflects the core insight: just as every part of a fractal contains the structure of the whole, every idea in a text is a potential entry point into an entire universe of connected concepts.

## Features

- **Shadow DOM isolation** — consistent styling on any website, immune to page CSS
- **Elegant deep-dive buttons** — subtle arrows that animate on hover
- **Smart markdown rendering** — handles various Claude response formats
- **Frosted glass UI** — premium feel with backdrop blur effects
- **Animated loading** — fractal tree visualization while processing

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aglitskaya07/fractal-reader.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked**

5. Select the `fractal-reader` folder

## Setup

1. Click the extension icon in Chrome toolbar
2. Enter your Anthropic API key
3. Get your key at [console.anthropic.com](https://console.anthropic.com/)

## Usage

1. Select any text on a webpage (minimum 10 characters)
2. Click the magnifying glass button that appears
3. Explore the analysis across four tabs
4. Click the ↗ arrow next to any item to discuss it further with Claude

## Under the Hood

The extension uses Claude Sonnet with a custom prompt that transforms any text fragment into a research entry point across four epistemological axes.

## Value Proposition

- **For researchers** — systematizes the process of exploring new topics
- **For students** — helps see context and connections between disciplines
- **For mindful readers** — transforms passive content consumption into active exploration

## Tech Stack

- Chrome Extensions Manifest V3
- Claude API (Anthropic) with prompt caching
- Shadow DOM for style isolation
- Vanilla JavaScript
- CSS3 (backdrop-filter, animations)

## License

MIT
