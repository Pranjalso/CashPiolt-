'use client';
import { ReactNode } from 'react';

export const Badge = ({ s }: { s: string }) => <span className={`badge s-${s}`}>{s.replace('_', ' ')}</span>;

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div className="spacer" />
          <button className="btn sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ height: 12 }} />
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div style={wide ? { gridColumn: '1/-1' } : undefined}><label>{label}</label>{children}</div>;
}

export const Msg = ({ err, ok }: { err?: string; ok?: string }) => (
  <>
    {err && <div className="err">{err}</div>}
    {ok && <div className="ok">{ok}</div>}
  </>
);

export function ConfirmModal({
  title = 'Please Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-bg" onClick={onCancel} style={{ zIndex: 200 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440, padding: 22, borderRadius: 14 }}
      >
        <div className="row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {danger && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#fde2e2',
                  color: 'var(--red)',
                  fontSize: 18,
                  fontWeight: 'bold',
                }}
              >
                !
              </span>
            )}
            <h3 style={{ margin: 0, fontSize: 17 }}>{title}</h3>
          </div>
          <div className="spacer" />
          <button type="button" className="btn sm" onClick={onCancel}>✕</button>
        </div>
        <p style={{ margin: '8px 0 20px', color: 'var(--text)', fontSize: 14, lineHeight: 1.5 }}>
          {message}
        </p>
        <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'red' : 'primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
