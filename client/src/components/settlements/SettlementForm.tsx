import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClientsQuery } from '@/hooks/useClients';
import { useCreateSettlement } from '@/hooks/useSettlements';
import { todayIso } from '@/utils/format';

const formSchema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK', 'CHEQUE']),
  referenceNumber: z.string().optional(),
  date: z.string().min(1),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SettlementFormProps {
  onDone: () => void;
  defaultClientId?: string;
}

const PAYMENT_MODES: FormValues['paymentMode'][] = ['CASH', 'UPI', 'BANK', 'CHEQUE'];

export function SettlementForm({ onDone, defaultClientId }: SettlementFormProps): JSX.Element {
  const { data: clients } = useClientsQuery();
  const createMutation = useCreateSettlement();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: defaultClientId ?? '',
      amount: undefined,
      paymentMode: 'CASH',
      referenceNumber: '',
      date: todayIso(),
      remarks: '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(values, { onSuccess: onDone });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="label">Client</label>
        <select className="input" {...register('clientId')} disabled={Boolean(defaultClientId)}>
          <option value="">Select client</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientName} ({c.businessName})
            </option>
          ))}
        </select>
        {errors.clientId && <p className="text-xs text-loss mt-1">{errors.clientId.message}</p>}
      </div>

      <div>
        <label className="label">Amount</label>
        <input type="number" step="0.01" className="input" placeholder="e.g. 20000" {...register('amount')} />
        {errors.amount && <p className="text-xs text-loss mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="label">Payment Mode</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_MODES.map((mode) => (
            <label
              key={mode}
              className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 py-2.5 text-xs font-semibold cursor-pointer has-[:checked]:bg-gold-500 has-[:checked]:border-gold-500 has-[:checked]:text-white text-gray-500"
            >
              <input type="radio" value={mode} className="hidden" {...register('paymentMode')} />
              {mode}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Reference Number (optional)</label>
        <input className="input" placeholder="UPI/Cheque/Txn ref" {...register('referenceNumber')} />
      </div>

      <div>
        <label className="label">Date</label>
        <input type="date" className="input" {...register('date')} />
      </div>

      <div>
        <label className="label">Remarks</label>
        <textarea className="input" rows={2} {...register('remarks')} />
      </div>

      <button type="submit" className="btn-primary w-full mt-1" disabled={isSubmitting}>
        Record Settlement
      </button>
    </form>
  );
}
