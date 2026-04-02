import { NotificationView } from '../shared/types'
import NoTimerNotification from './components/NoTimerNotification'
import EndOfDayNoTimer from './components/EndOfDayNoTimer'
import EndOfDayRunning from './components/EndOfDayRunning'
import SettingsDialog from './components/SettingsDialog'
import UpdateAvailableNotification from './components/UpdateAvailableNotification'
import UpdateSuccessNotification from './components/UpdateSuccessNotification'

function getView(): NotificationView {
  const params = new URLSearchParams(window.location.search)
  return (params.get('view') as NotificationView) || 'no-timer'
}

export default function App(): JSX.Element {
  const view = getView()

  switch (view) {
    case 'no-timer':
      return <NoTimerNotification />
    case 'eod-summary':
      return <EndOfDayNoTimer />
    case 'eod-running':
      return <EndOfDayRunning />
    case 'settings':
      return <SettingsDialog />
    case 'update-available':
      return <UpdateAvailableNotification />
    case 'update-success':
      return <UpdateSuccessNotification />
    default:
      return <NoTimerNotification />
  }
}
