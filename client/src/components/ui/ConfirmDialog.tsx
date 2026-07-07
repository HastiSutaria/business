import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidthClass="max-w-sm">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{message}</p>
      <div className="flex gap-3">
        <button className="btn-secondary flex-1" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
          {loading ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
