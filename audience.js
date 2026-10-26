'use strict';

// Presentation-only room aliases. Never replace or numerically coerce user_id.
const AudienceLabels = (() => {
  function key(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }
  function create(records) {
    const time = record => {
      if (record.send_timestamp === null || record.send_timestamp === undefined || record.send_timestamp === '') return Infinity;
      const value = Number(record.send_timestamp);
      return Number.isFinite(value) ? value : Infinity;
    };
    const ordered = records.map((record,index) => ({record,index}))
      .sort((a,b) => time(a.record) - time(b.record) || a.index - b.index);
    const labels = new Map();
    for (const {record} of ordered) {
      const id = key(record.user_id);
      if (id !== null && !labels.has(id)) labels.set(id, labels.size + 1);
    }
    return labels;
  }
  function name(labels, value) {
    const number = labels.get(key(value));
    return number === undefined ? '观众未标识' : '观众' + number;
  }
  return Object.freeze({key,create,name});
})();
