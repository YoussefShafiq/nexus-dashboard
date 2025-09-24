import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function DateRangePicker({ onDateChange, initialRange }) {
  const [startDate, setStartDate] = useState(initialRange?.startDate || null);
  const [endDate, setEndDate] = useState(initialRange?.endDate || null);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 256 });

  useEffect(() => {
    if (initialRange?.startDate || initialRange?.startDate === null) setStartDate(initialRange.startDate || null);
    if (initialRange?.endDate || initialRange?.endDate === null) setEndDate(initialRange.endDate || null);
  }, [initialRange?.startDate, initialRange?.endDate]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        if (buttonRef.current && !buttonRef.current.contains(e.target)) setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const margin = 4;
    const width = 256; // w-64
    let left = rect.left;
    // Keep within viewport horizontally
    if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
    if (left < margin) left = margin;
    const top = rect.bottom + margin;
    setPopoverPos({ top, left, width });
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
      const onScroll = () => updatePosition();
      const onResize = () => updatePosition();
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
      };
    }
  }, [open]);

  const toYMD = (d) => {
    if (!(d instanceof Date) || isNaN(d)) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };
  const toLabel = () => {
    const s = toYMD(startDate);
    const e = toYMD(endDate);
    if (!s && !e) return 'Select date range';
    if (s && !e) return `${s} → ...`;
    if (!s && e) return `... → ${e}`;
    return `${s} → ${e}`;
  };

  const apply = () => {
    onDateChange?.({ startDate, endDate });
    setOpen(false);
  };

  const clear = () => {
    setStartDate(null);
    setEndDate(null);
    onDateChange?.({ startDate: null, endDate: null });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        ref={buttonRef}
        className="w-full text-left text-xs p-1.5 border rounded hover:bg-gray-50"
        onClick={() => setOpen((o) => !o)}
        title="Filter by created date range"
      >
        {toLabel()}
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="bg-white border rounded shadow p-3"
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, width: popoverPos.width, zIndex: 9999 }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500">From</label>
            <input
              type="date"
              value={toYMD(startDate)}
              onChange={(e) => setStartDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
              className="text-xs p-1 border rounded w-full"
            />
            <label className="text-[10px] text-gray-500">To</label>
            <input
              type="date"
              value={toYMD(endDate)}
              onChange={(e) => setEndDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
              className="text-xs p-1 border rounded w-full"
            />
            <div className="flex justify-between gap-2 pt-1">
              <button type="button" className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={clear}>Clear</button>
              <button type="button" className="px-2 py-1 text-xs bg-primary text-white rounded" onClick={apply}>Apply</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
