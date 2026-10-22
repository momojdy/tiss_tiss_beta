import React from 'react';
import { usePrezoNavigation } from '../../../features/prezo/PrezoNavigationContext';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface NotFoundProps {
  title: string;
  message: string;
}

export const NotFoundState = ({ title, message }: NotFoundProps) => {
  const navigation = usePrezoNavigation();
  return (
    <EmptyState title={title} message={message} alert>
      <Button label="Browse campaigns" onPress={() => navigation.navigate({ name: 'explore', category: null })} />
      <Button label="Home" variant="ghost" onPress={() => navigation.navigate({ name: 'home' })} />
    </EmptyState>
  );
};

interface LoadFailureProps {
  title: string;
  message: string | null;
  onRetry: () => void;
}

export const LoadFailureState = ({ title, message, onRetry }: LoadFailureProps) => (
  <EmptyState title={title} message={message ?? undefined} alert>
    <Button label="Try again" onPress={onRetry} />
  </EmptyState>
);

