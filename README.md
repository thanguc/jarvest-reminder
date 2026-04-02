# Jarvest Timer

A desktop app that runs in the background and reminds you to track time in Harvest, integrated with Jira.

## Features

- **Background timer monitoring** — periodically checks if a Harvest timer is running during your working hours
- **Custom notifications** — shows interactive notifications (not OS-native) in the bottom-right corner
- **Jira integration** — lists your in-progress tickets so you can start a timer with one click
- **Harvest Platform API** — auto-maps Jira tickets to Harvest projects/tasks
- **End-of-day reminders** — notifies you to stop your timer at the end of the work day, with a 60-second auto-stop countdown
- **Configurable** — set your working hours, work days, and check period

## Setup

```bash
npm install
```

### Configuration

On first run, the Settings dialog opens automatically. You'll need:

- **Jira**: Your Atlassian domain (e.g. `mycompany`), email, and [API token](https://id.atlassian.com/manage-profile/security/api-tokens)
- **Harvest**: Your [access token and account ID](https://id.getharvest.com/developers)

### Development

```bash
npm run dev
```

### Build

```bash
npm run build        # compile
npm run package      # create distributable
```

## Tech Stack

- Electron + TypeScript
- React (renderer)
- Tailwind CSS
- electron-store (config persistence)
- electron-vite (build toolchain)
