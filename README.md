# Jarvest Reminder

A desktop tray app that reminds you to track time in Harvest, integrated with Jira. Runs silently in the background and nudges you when you forget to start a timer during work hours.

## Features

- **Background monitoring** — periodically checks if a Harvest timer is running during your configured work hours
- **Smart notifications** — interactive notifications in the bottom-right corner let you start a timer with one click
- **Jira integration** — lists your in-progress tickets so you can pick one and start tracking immediately
- **Harvest Platform API** — auto-maps Jira tickets to Harvest projects/tasks based on your history
- **End-of-day reminders** — notifies you to stop your timer at the end of the work day, with a 60-second auto-stop countdown
- **OAuth 2.0 sign-in** — connect to Jira and Harvest with one click, no manual token copying required
- **Configurable schedule** — set your working hours, work days, and how often to check

## Setup

```bash
npm install
```

### OAuth credentials

Copy `.env.example` to `.env` and fill in your OAuth app credentials:

```bash
cp .env.example .env
```

```
MAIN_VITE_HARVEST_CLIENT_ID=...
MAIN_VITE_HARVEST_CLIENT_SECRET=...
MAIN_VITE_JIRA_CLIENT_ID=...
MAIN_VITE_JIRA_CLIENT_SECRET=...
```

To obtain these, register developer apps on each platform:
- **Harvest**: https://id.getharvest.com/oauth2/clients — set redirect URL to `http://localhost:34115/auth/harvest/callback`
- **Jira**: https://developer.atlassian.com/console/myapps/ — set redirect URL to `http://localhost:34115/auth/jira/callback`

### Development

```bash
npm run dev
```

### Build

```bash
npm run build        # compile
npm run package      # create distributable
```

## First run

On first launch, the Settings dialog opens automatically. Click **Authorize Jira** and **Authorize Harvest** — a browser tab will open for each, you sign in and approve, and the app handles the rest. No tokens to copy.

## Tech Stack

- Electron + TypeScript
- React (renderer)
- Tailwind CSS
- electron-store (encrypted local config)
- electron-vite (build toolchain)
