"use client";

import React, { ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';


interface SwapCardProps {
  title: string;
  className?: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  isLoading?: boolean;
  onSubmit?: () => void;
  submitText?: string;
  submitDisabled?: boolean;
  learnMoreUrl?: string;
}

export function SwapCard({
  title,
  className,
  children,
  footerContent,
  isLoading = false,
  onSubmit,
  submitText = 'Submit',
  submitDisabled = false,
  learnMoreUrl,
}: SwapCardProps) {
  return (
    <Card className={cn("w-full max-w-md mx-auto shadow-lg", className)}>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {learnMoreUrl && (
            <a 
              href={learnMoreUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-sm text-muted-foreground hover:text-primary"
            >
              Learn more <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
      <CardFooter className="flex flex-col space-y-4 border-t border-border pt-4">
        {onSubmit && (
          <Button 
            onClick={onSubmit} 
            disabled={submitDisabled || isLoading} 
            className="w-full"
          >
            {isLoading ? 'Processing...' : submitText}
          </Button>
        )}
        {footerContent && <div className="w-full">{footerContent}</div>}
      </CardFooter>
    </Card>
  );
} 