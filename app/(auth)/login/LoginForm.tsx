'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth.actions';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setError('');

		const formData = new FormData(e.currentTarget);
		const result = await loginAction(formData);

		if (result.success) {
			toast.success('Login berhasil!', {
				description: `Selamat datang, ${result.data?.name}`,
			});
			router.push('/dashboard');
			router.refresh();
		} else {
			setError(result.message);
			setLoading(false);
		}
	}

	return (
		<form
			onSubmit={handleSubmit}
			className='space-y-4'
		>
			{error && (
				<div className='rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-scale-in'>
					{error}
				</div>
			)}

			<div className='space-y-2'>
				<label
					htmlFor='email'
					className='text-sm font-medium text-card-foreground'
				>
					Email
				</label>
				<input
					id='email'
					name='email'
					type='email'
					autoComplete='email'
					required
					placeholder='Email'
					className='flex h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50'
				/>
			</div>

			<div className='space-y-2'>
				<label
					htmlFor='password'
					className='text-sm font-medium text-card-foreground'
				>
					Password
				</label>
				<div className='relative'>
					<input
						id='password'
						name='password'
						type={showPassword ? 'text' : 'password'}
						autoComplete='current-password'
						required
						placeholder='Password'
						className='flex h-11 w-full rounded-lg border border-input bg-background px-3.5 pr-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50'
					/>
					<button
						type='button'
						onClick={() => setShowPassword(!showPassword)}
						className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
					>
						{showPassword ? (
							<EyeOff className='h-4 w-4' />
						) : (
							<Eye className='h-4 w-4' />
						)}
					</button>
				</div>
			</div>

			<button
				type='submit'
				disabled={loading}
				className='flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
			>
				{loading ? (
					<>
						<Loader2 className='mr-2 h-4 w-4 animate-spin' />
						Memproses...
					</>
				) : (
					'Masuk'
				)}
			</button>
		</form>
	);
}
