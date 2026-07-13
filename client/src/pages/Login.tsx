import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate, Navigate, Location } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiRequestError } from '@/services/apiClient';

const formSchema = z.object({
  loginId: z.string().min(1, 'Login ID is required'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof formSchema>;

export default function Login(): JSX.Element {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as Location & { state?: { from?: Location } };
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.loginId.trim(), values.password);
      navigate(location.state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.'
      );
    }
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-xl font-bold">Hasti Jewellers</h1>
          <p className="text-sm text-gray-400">Sign in to continue</p>
        </div>

        <form onSubmit={onSubmit} className="card p-5 flex flex-col gap-4" autoComplete="off">
          <div>
            <label className="label" htmlFor="loginId">
              Login ID
            </label>
            <input
              id="loginId"
              className="input"
              autoComplete="username"
              autoFocus
              {...register('loginId')}
            />
            {errors.loginId && <p className="text-xs text-loss mt-1">{errors.loginId.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                autoComplete="current-password"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-loss mt-1">{errors.password.message}</p>}
          </div>

          {formError && (
            <div className="rounded-xl bg-loss/10 text-loss text-sm px-3 py-2.5 flex items-center gap-2">
              <Lock size={14} className="shrink-0" />
              {formError}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
