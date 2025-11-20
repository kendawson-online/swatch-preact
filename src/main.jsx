import { render } from 'preact'
import { App } from './app.jsx'
import './styles.css'
import { registerServiceWorker } from './utils/notifications';

render(<App />, document.getElementById('app'))

// register service worker (best-effort)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
	// register in a short timeout to avoid blocking initial render
	setTimeout(() => {
		registerServiceWorker().catch(() => {});
	}, 1000);
}
