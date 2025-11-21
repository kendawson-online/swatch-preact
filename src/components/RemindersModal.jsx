import { useEffect, useState } from 'preact/hooks';
import { calculateSwatchTime, localTimeToBeats } from '../utils/swatchTime';
import { requestNotificationPermission } from '../utils/notifications';
import { saveReminders } from '../utils/storage';

export function RemindersModal({ events, setEvents, reminderModalRef, setSelectedEvent, mute, setMute }) {
  const [swatchText, setSwatchText] = useState('000');

  useEffect(() => {
    function update() {
      try {
        const beats = calculateSwatchTime();
        const whole = String(Math.trunc(Number(beats))).padStart(3, '0');
        setSwatchText(whole);
      } catch (e) {
        // ignore
      }
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  // active = all non-dismissed reminders (includes due/past and upcoming)
  const active = (events || []).filter(e => !e.dismissed);

  // partition into due (past or equal) and upcoming (future or no reminderTime)
  const due = active.filter(e => e.reminderTime && new Date(e.reminderTime).getTime() <= now)
    .sort((a,b) => {
      // show most recently due first
      const ta = a.reminderTime ? new Date(a.reminderTime).getTime() : 0;
      const tb = b.reminderTime ? new Date(b.reminderTime).getTime() : 0;
      return tb - ta;
    });

  const upcoming = active.filter(e => !(e.reminderTime && new Date(e.reminderTime).getTime() <= now))
    .sort((a,b) => {
      const ta = a.reminderTime ? new Date(a.reminderTime).getTime() : Infinity;
      const tb = b.reminderTime ? new Date(b.reminderTime).getTime() : Infinity;
      return ta - tb;
    });

  const displayList = [...due, ...upcoming];

  const handleNotificationToggle = async (e) => {
    const checked = e.target.checked;
    if (checked) {
      const perm = await requestNotificationPermission();
      // reflect browser permission
      if (perm === 'granted') {
        // do nothing else; checkbox will remain checked
      } else {
        // show denied -> leave unchecked
        e.target.checked = false;
      }
    } else {
      // user tried to uncheck; instruct to revoke permission in browser
      alert('This checkbox reflects your browser\'s permission settings for notifications. To revoke these permissions, you have to change your browser settings. Learn more: https://swatchtime.online/notifications.html');
      // keep checkbox reflecting actual permission
      e.target.checked = Notification.permission === 'granted';
    }
  };

  const handleMuteToggle = (e) => {
    const checked = e.target.checked;
    if (typeof setMute === 'function') setMute(checked);
  };

  const handleDelete = (id) => {
    const ev = (events || []).find(r => r.id === id);
    const nowT = Date.now();
    const isDue = ev && ev.reminderTime && new Date(ev.reminderTime).getTime() <= nowT;
    const prompt = isDue ? 'Dismiss this reminder?' : 'Delete this reminder?';
    if (!confirm(prompt)) return;
    const updated = events.filter(r => r.id !== id);
    setEvents(updated);
    saveReminders(updated);
  };

  return (
    <div className="modal fade" id="remindersModal" tabIndex="-1" aria-labelledby="remindersModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="remindersModalLabel">Reminders</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
              <div>Current time: <strong>@{swatchText}</strong></div>
              <div className="d-flex gap-2">
                <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="enableNotifications" defaultChecked={Notification.permission === 'granted'} onChange={handleNotificationToggle} />
                  <label className="form-check-label" htmlFor="enableNotifications">Enable browser notifications</label>
                </div>
                <div className="btn-group ms-3" role="group" aria-label="Reminders actions">
                  <input type="checkbox" className="btn-check" id="mute-toggle" autoComplete="off" checked={!!mute} onChange={handleMuteToggle} />
                  <label className="btn btn-outline-secondary" htmlFor="mute-toggle" title="Mute reminders"><i className="bi bi-bell-slash"></i></label>

                  <button className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#reminderModal" title="New Reminder" onClick={() => setSelectedEvent(null)}><i className="bi bi-plus-square"></i></button>
                </div>
              </div>
            </div>
            <div>
              {/* Future section */}
              <h6 className="mt-2">Future</h6>
              <div className="mb-3">
                {upcoming.length === 0 ? (
                  <div className="text-muted">No future reminders.</div>
                ) : (
                  upcoming.map(r => {
                    return (
                      <div key={r.id} className={`d-flex align-items-center border rounded p-2 mb-2 reminder-future-row`}>
                        <div style={{ width: '80px' }}>
                          <strong className="swatch-future">@{(() => {
                            try {
                              if (r.swatchTime) return String(Math.trunc(Number(r.swatchTime))).padStart(3, '0');
                              if (r.reminderTime) {
                                const b = Number(localTimeToBeats(new Date(r.reminderTime)));
                                if (!Number.isNaN(b)) return String(Math.trunc(b)).padStart(3, '0');
                              }
                            } catch (e) {}
                            return String(Math.trunc(Number(0))).padStart(3, '0');
                          })()}</strong>
                        </div>
                        <div className="flex-grow-1 text-truncate">{r.title}</div>
                        <div className="d-flex gap-2 ms-3">
                          <button className="btn btn-sm btn-outline-secondary" data-bs-toggle={'modal'} data-bs-target={'#reminderModal'} onClick={() => setSelectedEvent(r)} title={'Edit reminder'}> <i className="bi bi-pencil"></i> </button>
                          <button className={`btn btn-sm btn-outline-danger`} onClick={() => handleDelete(r.id)} title={'Delete reminder'}> <i className="bi bi-x"></i> </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Spacer */}
              <div style={{ height: '12px' }}></div>

              {/* Past section */}
              <h6 className="mt-2">Past</h6>
              <div className="mb-3">
                {due.length === 0 ? (
                  <div className="text-muted">No past reminders.</div>
                ) : (
                  due.map(r => {
                    return (
                      <div key={r.id} className={`d-flex align-items-center border rounded p-2 mb-2 reminder-past-row`}>
                        <div style={{ width: '80px' }}>
                          <strong className="swatch-past">@{(() => {
                            try {
                              if (r.swatchTime) return String(Math.trunc(Number(r.swatchTime))).padStart(3, '0');
                              if (r.reminderTime) {
                                const b = Number(localTimeToBeats(new Date(r.reminderTime)));
                                if (!Number.isNaN(b)) return String(Math.trunc(b)).padStart(3, '0');
                              }
                            } catch (e) {}
                            return String(Math.trunc(Number(0))).padStart(3, '0');
                          })()}</strong>
                        </div>
                        <div className="flex-grow-1 text-truncate">{r.title}</div>
                        <div className="d-flex gap-2 ms-3">
                          <button className="btn btn-sm btn-outline-secondary" disabled title={'Edit disabled for past reminders'}> <i className="bi bi-pencil"></i> </button>
                          <button className={`btn btn-sm btn-outline-secondary`} onClick={() => handleDelete(r.id)} title={'Dismiss reminder'}> <i className="bi bi-check2-square"></i> </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
