import { useState } from 'preact/hooks';
import { calculateSwatchTime, beatsToLocalTime, normalizeBeats } from '../utils/swatchTime';

export function TimeCalculator({ settings }) {
  const [swatchValue, setSwatchValue] = useState('');
  const [localHours, setLocalHours] = useState('');
  const [localMinutes, setLocalMinutes] = useState('');
  const [localSeconds, setLocalSeconds] = useState('');
  const [localAmPm, setLocalAmPm] = useState('AM');

  // Helper: format beats for display: pad integer part to 3 digits, preserve decimals
  function formatBeatsDisplay(s) {
    if (!s) return '';
    const parts = String(s).split('.');
    const intPart = parts[0].padStart(3, '0');
    if (parts.length === 1) return intPart;
    const dec = parts[1];
    // limit decimals to max 2
    return `${intPart}.${(dec + '00').slice(0, 2)}`;
  }

  const handleSwatchChange = (value) => {
    // accept raw input but don't allow more than 6 chars (e.g. 120.00)
    let raw = String(value || '').trim();
    if (raw.startsWith('@')) raw = raw.slice(1);
    // limit to digits and dot
    raw = raw.replace(/[^0-9.]/g, '');
    if (raw.length > 6) raw = raw.slice(0, 6);
    setSwatchValue(raw);
  };

  const handleSwatchSubmit = () => {
    const normalized = normalizeBeats(swatchValue);
    if (!normalized) {
      setSwatchValue('');
      setLocalHours(''); setLocalMinutes(''); setLocalSeconds('');
      return;
    }
    // format for display
    const display = formatBeatsDisplay(normalized);
    setSwatchValue(display);

    const beats = parseFloat(normalized);
    if (!Number.isNaN(beats) && beats >= 0 && beats < 1000) {
      const localDate = beatsToLocalTime(beats);
      let hh = localDate.getHours();
      let mm = localDate.getMinutes();
      let ss = localDate.getSeconds();
      if (settings && settings.timeFormat24 === false) {
        // convert to 12-hour
        setLocalAmPm(hh >= 12 ? 'PM' : 'AM');
        hh = ((hh + 11) % 12) + 1; // 1-12
      }
      setLocalHours(String(hh).padStart(2, '0'));
      setLocalMinutes(String(mm).padStart(2, '0'));
      setLocalSeconds(String(ss).padStart(2, '0'));
    }
  };

  const handleLocalChange = (hours, minutes, seconds, ampm, onConvert = false) => {
    // allow seconds to be optional; do not auto-fill seconds in the input state
    // so the user can leave it blank while typing. We will treat missing
    // seconds as '00' only when performing a conversion.
    setLocalHours(hours);
    setLocalMinutes(minutes);
    setLocalSeconds(seconds);
    if (ampm) setLocalAmPm(ampm);

    // convert when hours and minutes are provided (seconds optional)
    if (hours !== '' && minutes !== '') {
      let h = parseInt(hours) || 0;
      const m = parseInt(minutes) || 0;
      const s = parseInt(seconds || '0') || 0;

      if (settings && settings.timeFormat24 === false) {
        // convert 12-hour + AM/PM into 24-hour
        if ((ampm || localAmPm) === 'PM' && h < 12) h = h + 12;
        if ((ampm || localAmPm) === 'AM' && h === 12) h = 0;
      }

      if (h >= 0 && h < 24 && m >= 0 && m < 60 && s >= 0 && s < 60) {
        const date = new Date();
        date.setHours(h, m, s, 0);
        const beats = calculateSwatchTime(date);
        // format beats for display
        setSwatchValue(formatBeatsDisplay(beats));
      } else if (onConvert) {
        // If conversion was explicitly requested and values are out of range,
        // treat this like the Clear action: clear the beats and reset the
        // local inputs (so the form is empty and ready for new input).
        setSwatchValue('');
        setLocalHours('');
        setLocalMinutes('');
        setLocalSeconds('');
        setLocalAmPm('AM');
      }
    }
  };

  const handleConvertClick = (e) => {
    e.preventDefault();
    // Prefer converting the swatch beats input when it's present. If it's
    // empty, fall back to converting the local time inputs (this allows the
    // user to convert either direction predictably). When converting local
    // inputs explicitly, pass onConvert=true so invalid values are reset.
    if (swatchValue && swatchValue.trim() !== '') {
      handleSwatchSubmit();
    } else if (localHours !== '' || localMinutes !== '' || localSeconds !== '') {
      handleLocalChange(localHours, localMinutes, localSeconds, localAmPm, true);
    }
  };

  return (
    <div className="modal fade" id="calculatorModal" tabIndex="-1" aria-labelledby="calculatorModalLabel" aria-hidden="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="calculatorModalLabel">Time Converter</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleConvertClick}>
            <div className="mb-4">
              <label className="form-label">Swatch Internet Time (@beats)</label>
              <div className="input-group">
                <span className="input-group-text" id="beats-addon">@</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="000.00"
                  aria-describedby="beats-addon"
                  value={swatchValue}
                  maxLength={7}
                  onChange={(e) => handleSwatchChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="text-center mb-3">
              <button type="submit" className="btn btn-lg btn-secondary px-5 py-2" title="Convert selected time">⇅</button>
            </div>
            
            <div className="mb-3">
              <label className="form-label">Local Time {(settings && settings.timeFormat24 === false) ? '(12-hour)' : '(24-hour)'}</label>
              <div>
                {settings && settings.timeFormat24 === false ? (
                  <div className="row g-2">
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="HH"
                        min="1"
                        max="12"
                        value={localHours}
                        onChange={(e) => handleLocalChange(e.target.value, localMinutes, localSeconds)}
                      />
                      <small className="text-muted">Hours</small>
                    </div>
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="MM"
                        min="0"
                        max="59"
                        value={localMinutes}
                        onChange={(e) => handleLocalChange(localHours, e.target.value, localSeconds)}
                      />
                      <small className="text-muted">Minutes</small>
                    </div>
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="SS"
                        min="0"
                        max="59"
                        value={localSeconds}
                        onChange={(e) => handleLocalChange(localHours, localMinutes, e.target.value)}
                      />
                      <small className="text-muted">Seconds</small>
                    </div>
                    <div className="col-12 mt-2">
                      <select className="form-select" value={localAmPm} onChange={(e) => { setLocalAmPm(e.target.value); handleLocalChange(localHours, localMinutes, localSeconds, e.target.value); }}>
                        <option>AM</option>
                        <option>PM</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="row g-2">
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="HH"
                        min="0"
                        max="23"
                        value={localHours}
                        onChange={(e) => handleLocalChange(e.target.value, localMinutes, localSeconds)}
                      />
                      <small className="text-muted">Hours (0-23)</small>
                    </div>
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="MM"
                        min="0"
                        max="59"
                        value={localMinutes}
                        onChange={(e) => handleLocalChange(localHours, e.target.value, localSeconds)}
                      />
                      <small className="text-muted">Minutes</small>
                    </div>
                    <div className="col">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="SS"
                        min="0"
                        max="59"
                        value={localSeconds}
                        onChange={(e) => handleLocalChange(localHours, localMinutes, e.target.value)}
                      />
                      <small className="text-muted">Seconds</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={() => { setSwatchValue(''); setLocalHours(''); setLocalMinutes(''); setLocalSeconds(''); setLocalAmPm('AM'); }}>Clear</button>
            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
