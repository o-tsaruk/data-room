'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldSet, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthErrorDialog } from '@/src/components/AuthErrorDialog';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError(null);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError(null);
    await signIn('email', { email, callbackUrl: '/dashboard' });
  };

  if (status === 'loading' || status === 'authenticated') {
    return null;
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/30'>
      <Suspense fallback={null}>
        <AuthErrorDialog />
      </Suspense>

      <Card className='w-full max-w-md shadow-lg'>
        <CardHeader>
          <CardTitle className='text-center text-2xl '>Welcome to Data Room</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleEmailLogin} className='space-y-4'>
            <FieldSet>
              <Field>
                <FieldLabel htmlFor='email'>Email address</FieldLabel>
                <Input
                  id='email'
                  type='email'
                  placeholder='Enter your email'
                  value={email}
                  onChange={handleEmailChange}
                  required
                  aria-invalid={emailError ? 'true' : 'false'}
                />
                {emailError && <p className='text-destructive text-sm mt-1'>{emailError}</p>}
              </Field>
            </FieldSet>

            <Button type='submit' className='w-full'>
              Continue with Email
            </Button>
          </form>

          <div className='my-6 flex items-center justify-center'>
            <div className='border-t w-1/3' />
            <span className='px-2 text-muted-foreground text-sm'>or</span>
            <div className='border-t w-1/3' />
          </div>

          <Button
            variant='outline'
            className='w-full flex items-center justify-center gap-2'
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          >
            <img src='/google-logo.svg' alt='Google' className='w-5 h-5' />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
