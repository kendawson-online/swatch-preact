import { ReminderBell } from './ReminderBell';

export function Navbar({ settings, setSettings, events, setEvents, mute }) {
  const handleThemeToggle = () => {
    setSettings({ ...settings, darkTheme: !settings.darkTheme });
  };

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary mb-4">
      <div className="container-fluid d-flex align-items-center">

        <a className="navbar-brand mb-0 h1 d-flex align-items-center" href="/">
          <img src="/swiss-flag.svg" alt="" width="30" height="30" />
          <span className="ms-2">Swatch Internet Time</span>
        </a>

        <div className="d-flex align-items-center ms-auto" title="Toggle Theme Color">
          <i className={`bi bi-brightness-high me-2 ${settings.darkTheme ? 'icon-bright-dark' : 'icon-bright-light'}`}></i>
          <div className="form-check form-switch">
            <input
              className="form-check-input cursor-pointer"
              type="checkbox"
              id="themeSwitch"
              checked={settings.darkTheme}
              onChange={handleThemeToggle}
            />
          </div>
          <i className={`bi bi-moon-stars-fill me-2 ${settings.darkTheme ? 'icon-moon-dark' : 'icon-moon-light'}`}></i>
        </div>

        <div className="d-flex ms-4 gap-2 align-items-center">
          <div className="d-flex align-items-center me-3">
            <ReminderBell events={events} darkTheme={settings.darkTheme} mute={mute} onDismiss={(id) => {
              if (typeof setEvents === 'function') {
                // remove dismissed reminder from storage when user dismisses
                setEvents(prev => prev.filter(e => e.id !== id));
              }
            }} />
          </div>

          <button 
            className="btn btn-outline-secondary"
            data-bs-toggle="modal"
            data-bs-target="#calculatorModal"
            title="Time Calculator"
          >
            <i className="bi bi-calculator"></i>
          </button>

          <button
            className="btn btn-outline-secondary position-relative"
            data-bs-toggle="modal"
            data-bs-target="#remindersModal"
            title="Reminders"
          >
            <i className="bi bi-envelope"></i>
            {(() => {
              const count = events ? events.filter(e => !e.dismissed).length : 0;
              return count > 0 ? (
                <span className="position-absolute reminder-badge start-100 translate-middle badge rounded-pill bg-danger">
                  {count}
                  <span className="visually-hidden">active reminders</span>
                </span>
              ) : null;
            })()}
          </button>

          <button 
            className="btn btn-outline-secondary ms-3"
            data-bs-toggle="modal"
            data-bs-target="#settingsModal"
            title="Settings"
          >
            <i className="bi bi-gear"></i>
          </button>

        </div>

      </div>
    </nav>
  );
}
