'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ConfirmOptions = {
  title: string;
  description?: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
};

type PromptOptions = ConfirmOptions & {
  placeholder?: string;
  defaultValue?: string;
};

type ChoiceOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

type ChoiceOptions<T extends string = string> = Omit<
  ConfirmOptions,
  'confirmLabel' | 'cancelLabel' | 'variant'
> & {
  choices: ChoiceOption<T>[];
  cancelLabel?: string;
};

type DialogState =
  | { type: 'confirm'; options: ConfirmOptions }
  | { type: 'prompt'; options: PromptOptions }
  | { type: 'choice'; options: ChoiceOptions }
  | null;

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  choice: <T extends string>(options: ChoiceOptions<T>) => Promise<T | null>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState('');
  const resolveRef = useRef<((value: any) => void) | null>(null);

  const cleanup = useCallback(() => {
    setState(null);
    setInputValue('');
    resolveRef.current = null;
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({ type: 'confirm', options });
      }),
    []
  );

  const prompt = useCallback(
    (options: PromptOptions): Promise<string | null> =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setInputValue(options.defaultValue ?? '');
        setState({ type: 'prompt', options });
      }),
    []
  );

  const choice = useCallback(
    <T extends string>(options: ChoiceOptions<T>): Promise<T | null> =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({ type: 'choice', options: options as ChoiceOptions });
      }),
    []
  );

  function handleOpenChange(open: boolean) {
    if (!open) {
      if (state?.type === 'confirm') resolveRef.current?.(false);
      else resolveRef.current?.(null);
      cleanup();
    }
  }

  function handleConfirm() {
    resolveRef.current?.(true);
    cleanup();
  }

  function handlePromptSubmit() {
    const trimmed = inputValue.trim();
    resolveRef.current?.(trimmed || null);
    cleanup();
  }

  function handleChoice(value: string) {
    resolveRef.current?.(value);
    cleanup();
  }

  function handleCancel() {
    if (state?.type === 'confirm') resolveRef.current?.(false);
    else resolveRef.current?.(null);
    cleanup();
  }

  return (
    <ConfirmContext.Provider value={{ confirm, prompt, choice }}>
      {children}
      <Dialog open={!!state} onOpenChange={handleOpenChange}>
        <DialogContent>
          {state && (
            <>
              <DialogHeader>
                <DialogTitle>{state.options.title}</DialogTitle>
                {state.options.description && (
                  <DialogDescription>
                    {state.options.description}
                  </DialogDescription>
                )}
              </DialogHeader>

              {state.options.body}

              {state.type === 'prompt' && (
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={
                    (state.options as PromptOptions).placeholder ?? ''
                  }
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePromptSubmit();
                  }}
                />
              )}

              <DialogFooter>
                {state.type === 'choice' ? (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      {state.options.cancelLabel ?? 'Cancel'}
                    </Button>
                    {(state.options as ChoiceOptions).choices.map((c) => (
                      <Button
                        key={c.value}
                        variant={c.variant ?? 'default'}
                        onClick={() => handleChoice(c.value)}
                      >
                        {c.label}
                      </Button>
                    ))}
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleCancel}>
                      {state.options.cancelLabel ?? 'Cancel'}
                    </Button>
                    <Button
                      variant={
                        state.type === 'confirm'
                          ? (state.options.variant ?? 'default')
                          : 'default'
                      }
                      onClick={
                        state.type === 'prompt'
                          ? handlePromptSubmit
                          : handleConfirm
                      }
                      disabled={
                        state.type === 'prompt' && !inputValue.trim()
                      }
                    >
                      {state.options.confirmLabel ?? 'Confirm'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
