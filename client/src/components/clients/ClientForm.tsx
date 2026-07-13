import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { Client } from '@/types';

const formSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  businessName: z.string().default(''),
  mobile: z
    .string()
    .regex(/^[0-9+\-\s]{7,15}$/, 'Enter a valid mobile number')
    .or(z.literal(''))
    .default(''),
  address: z.string().optional(),
  gst: z.string().optional(),
  openingBalance: z.coerce.number(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
  client?: Client;
  onDone: () => void;
}

export function ClientForm({ client, onDone }: ClientFormProps): JSX.Element {
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isEditing = Boolean(client);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientName: client?.clientName ?? '',
      businessName: client?.businessName ?? '',
      mobile: client?.mobile ?? '',
      address: client?.address ?? '',
      gst: client?.gst ?? '',
      openingBalance: client?.openingBalance ?? 0,
      notes: client?.notes ?? '',
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (isEditing && client) {
      updateMutation.mutate({ id: client.id, input: values }, { onSuccess: onDone });
    } else {
      createMutation.mutate(values, { onSuccess: onDone });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Client Name</label>
          <input className="input" placeholder="Rajesh Shah" {...register('clientName')} />
          {errors.clientName && <p className="text-xs text-loss mt-1">{errors.clientName.message}</p>}
        </div>
        <div>
          <label className="label">Business Name</label>
          <input className="input" placeholder="ABC Jewellers" {...register('businessName')} />
          {errors.businessName && <p className="text-xs text-loss mt-1">{errors.businessName.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Mobile</label>
          <input className="input" placeholder="9876543210" {...register('mobile')} />
          {errors.mobile && <p className="text-xs text-loss mt-1">{errors.mobile.message}</p>}
        </div>
        <div>
          <label className="label">GST (optional)</label>
          <input className="input uppercase" placeholder="27ABCDE1234F1Z5" {...register('gst')} />
        </div>
      </div>

      <div>
        <label className="label">Address</label>
        <input className="input" placeholder="Shop / street / city" {...register('address')} />
      </div>

      <div>
        <label className="label">Opening Balance</label>
        <input type="number" step="0.01" className="input" {...register('openingBalance')} />
        <p className="text-xs text-gray-400 mt-1">Positive = client owes you. Negative = you owe client.</p>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} {...register('notes')} />
      </div>

      <button type="submit" className="btn-primary w-full mt-1" disabled={isSubmitting}>
        {isEditing ? 'Update Client' : 'Add Client'}
      </button>
    </form>
  );
}
