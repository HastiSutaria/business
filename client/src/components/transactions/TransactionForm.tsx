import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClientsQuery } from '@/hooks/useClients';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { Transaction } from '@/types';
import { formatCurrencyPrecise, nowTimeHm, todayIso } from '@/utils/format';
import { toStorageQuantity, toDisplayQuantity, toStorageRate, toDisplayRate } from '@/utils/units';

const formSchema = z.object({
  clientId: z.string().min(1, 'Select a client'),
  metal: z.enum(['GOLD', 'SILVER']),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  rate: z.coerce.number().positive('Rate must be greater than 0'),
  date: z.string().min(1),
  time: z.string().min(1),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  onDone: () => void;
  defaultClientId?: string;
}

export function TransactionForm({ transaction, onDone, defaultClientId }: TransactionFormProps): JSX.Element {
  const { data: clients } = useClientsQuery();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isEditing = Boolean(transaction);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: transaction?.clientId ?? defaultClientId ?? '',
      metal: transaction?.metal ?? 'SILVER',
      type: transaction?.type ?? 'BUY',
      quantity: transaction ? toDisplayQuantity(transaction.metal, transaction.quantity) : undefined,
      rate: transaction ? toDisplayRate(transaction.metal, transaction.rate) : undefined,
      date: transaction?.date ?? todayIso(),
      time: transaction?.time ?? nowTimeHm(),
      remarks: transaction?.remarks ?? '',
    },
  });

  useEffect(() => {
    if (transaction) {
      reset({
        clientId: transaction.clientId,
        metal: transaction.metal,
        type: transaction.type,
        quantity: toDisplayQuantity(transaction.metal, transaction.quantity),
        rate: toDisplayRate(transaction.metal, transaction.rate),
        date: transaction.date,
        time: transaction.time,
        remarks: transaction.remarks ?? '',
      });
    }
  }, [transaction, reset]);

  useEffect(() => {
    if (!isEditing && !defaultClientId && clients && clients.length > 0 && !getValues('clientId')) {
      setValue('clientId', clients[0].id);
    }
  }, [clients, isEditing, defaultClientId, setValue, getValues]);

  const metal = watch('metal');
  const quantity = watch('quantity');
  const rate = watch('rate');
  const computedAmount = useMemo(() => {
    const q = Number(quantity);
    const r = Number(rate);
    if (!q || !r || Number.isNaN(q) || Number.isNaN(r)) return 0;
    return q * r;
  }, [quantity, rate]);

  const onSubmit = handleSubmit((values) => {
    const payload = {
      clientId: values.clientId,
      metal: values.metal,
      type: values.type,
      quantity: toStorageQuantity(values.metal, values.quantity),
      rate: toStorageRate(values.metal, values.rate),
      date: values.date,
      time: values.time,
      remarks: values.remarks,
    };

    if (isEditing && transaction) {
      updateMutation.mutate(
        { id: transaction.id, input: payload },
        { onSuccess: onDone }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: onDone });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="label">Client</label>
        <select className="input" {...register('clientId')}>
          <option value="">Select client</option>
          {clients?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.clientName} ({c.businessName})
            </option>
          ))}
        </select>
        {errors.clientId && <p className="text-xs text-loss mt-1">{errors.clientId.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Metal</label>
          <Controller
            control={control}
            name="metal"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {(['SILVER', 'GOLD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      field.onChange(m);
                      setValue('quantity', undefined as unknown as number);
                      setValue('rate', undefined as unknown as number);
                    }}
                    className={`rounded-xl py-2.5 text-sm font-semibold border transition ${
                      field.value === m
                        ? 'bg-gold-500 border-gold-500 text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    {m === 'GOLD' ? '🟡 Gold' : '⚪ Silver'}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
        <div>
          <label className="label">Type</label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {(['BUY', 'SELL'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => field.onChange(t)}
                    className={`rounded-xl py-2.5 text-sm font-semibold border transition ${
                      field.value === t
                        ? t === 'BUY'
                          ? 'bg-profit border-profit text-white'
                          : 'bg-loss border-loss text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Quantity ({metal === 'SILVER' ? 'kg' : 'grams'})</label>
          <input
            type="number"
            step="0.001"
            className="input"
            placeholder={metal === 'SILVER' ? 'e.g. 50' : 'e.g. 10'}
            {...register('quantity')}
          />
          {errors.quantity && <p className="text-xs text-loss mt-1">{errors.quantity.message}</p>}
        </div>
        <div>
          <label className="label">Rate (per {metal === 'SILVER' ? 'kg' : 'gram'})</label>
          <input
            type="number"
            step="0.01"
            className="input"
            placeholder={metal === 'SILVER' ? 'e.g. 92000' : 'e.g. 9600'}
            {...register('rate')}
          />
          {errors.rate && <p className="text-xs text-loss mt-1">{errors.rate.message}</p>}
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-500">Auto-calculated Amount</span>
        <span className="text-lg font-bold text-gold-600 dark:text-gold-400">
          {formatCurrencyPrecise(computedAmount)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" {...register('date')} />
        </div>
        <div>
          <label className="label">Time</label>
          <input type="time" className="input" {...register('time')} />
        </div>
      </div>

      <div>
        <label className="label">Remarks</label>
        <textarea className="input" rows={2} placeholder="Optional notes" {...register('remarks')} />
      </div>

      <button type="submit" className="btn-primary w-full mt-1" disabled={isSubmitting}>
        {isEditing ? 'Update Transaction' : 'Save Transaction'}
      </button>
    </form>
  );
}
