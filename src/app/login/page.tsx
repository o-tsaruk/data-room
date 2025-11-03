'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldSet, Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn('email', { email, callbackUrl: '/dashboard' });
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-muted/30'>
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
