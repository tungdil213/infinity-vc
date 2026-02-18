import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils';

const badgeVariants = cva(
	'inline-flex items-center justify-center rounded-base border-2 border-border px-2 py-0.5 text-xs font-base w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 transition-all overflow-auto',
	{
		variants: {
			variant: {
				default:
					'bg-main text-main-foreground shadow-shadow [a&]:hover:translate-x-boxShadowX [a&]:hover:translate-y-boxShadowY [a&]:hover:shadow-none',
				secondary:
					'bg-secondary-background text-foreground shadow-shadow [a&]:hover:translate-x-boxShadowX [a&]:hover:translate-y-boxShadowY [a&]:hover:shadow-none',
				destructive:
					'bg-destructive text-white shadow-shadow [a&]:hover:translate-x-boxShadowX [a&]:hover:translate-y-boxShadowY [a&]:hover:shadow-none',
				neutral: 'bg-background text-foreground [a&]:hover:bg-secondary-background',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

function Badge({
	className,
	variant,
	asChild = false,
	...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : 'span';

	return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
