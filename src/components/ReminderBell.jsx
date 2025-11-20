import { useState, useEffect } from 'preact/hooks';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

export function ReminderBell({ events, darkTheme, onDismiss }) {
  const [activeReminders, setActiveReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentReminder, setCurrentReminder] = useState(null);

  useEffect(() => {
    // Check for events that need reminders. Use functional updates to avoid
    // reading stale state and prevent effect re-creation loops.
    const checkReminders = () => {
      const now = new Date();
      events.forEach(event => {
        if (event.reminderTime && !event.dismissed) {
          const reminderTime = new Date(event.reminderTime);
          if (now >= reminderTime) {
            setActiveReminders(prev => {
              if (prev.find(r => r.id === event.id)) return prev;
              const newReminder = { ...event, acknowledged: false };
              // If no current reminder is selected, set this one
              setCurrentReminder(curr => curr || newReminder);
              setShowModal(true);

              // Try to request permission (if needed) and show a notification
              (async () => {
                try {
                  const perm = await requestNotificationPermission();
                  if (perm === 'granted') {
                    showNotification(newReminder.title || 'Reminder', {
                      body: newReminder.description || '',
                      tag: `reminder-${newReminder.id}`
                    });
                  }
                } catch (e) {
                  // ignore notification failures
                }
              })();

              return [...prev, newReminder];
            });
          }
        }
      });
    };

    // Run immediately and then poll every second.
    checkReminders();
    const interval = setInterval(checkReminders, 1000);
    return () => clearInterval(interval);
  }, [events]);

  const handleOk = () => {
    if (currentReminder) {
      setActiveReminders(prev =>
        prev.map(r => r.id === currentReminder.id ? { ...r, acknowledged: true } : r)
      );
    }
    setShowModal(false);
  };

  const handleDismiss = () => {
    if (currentReminder) {
      setActiveReminders(prev => prev.filter(r => r.id !== currentReminder.id));
      if (typeof onDismiss === 'function') onDismiss(currentReminder.id);
    }
    setShowModal(false);
  };

  const handleBellClick = () => {
    if (activeReminders.length > 0) {
      setCurrentReminder(activeReminders[0]);
      setShowModal(true);
    }
  };

  const hasActiveReminders = activeReminders.length > 0;

  if (!hasActiveReminders) return null;

  const bellClass = darkTheme ? 'bell-dark' : 'bell-light';

  // compute a friendly display time for the current reminder
  let displayTime = '';
  if (currentReminder) {
    if (currentReminder.reminderTime) {
      const d = new Date(currentReminder.reminderTime);
      displayTime = d.toLocaleString();
    } else if (currentReminder.startDate && currentReminder.startTime) {
      try {
        const [y, m, d] = currentReminder.startDate.split('-').map(Number);
        const [hh, mm] = currentReminder.startTime.split(':').map(Number);
        const dt = new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
        displayTime = dt.toLocaleString();
      } catch (e) {
        displayTime = `${currentReminder.startDate} ${currentReminder.startTime}`;
      }
    } else {
      displayTime = currentReminder.startDate || currentReminder.startTime || '';
    }
  }

  return (
    <>
      <button 
        className={`btn position-relative ${bellClass}`}
        onClick={handleBellClick}
        title="Reminders"
      >
        <i className="bi bi-bell-fill"></i>
      </button>

      {showModal && currentReminder && (
        <div className="modal show d-block modal-overlay" tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reminder</h5>
              </div>
              <div className="modal-body">
                <h6>{currentReminder.title}</h6>
                <p>{currentReminder.description}</p>
                {displayTime && (
                  <p className="text-muted">
                    <small>{displayTime}</small>
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleOk}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={handleDismiss}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
