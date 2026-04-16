'use client';

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { faqs } from '@/lib/constants/faq';

export function FAQ() {
	return (
		<section className="py-20 md:py-28">
			<div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
						Frequently Asked Questions
					</h2>
					<p className="text-lg text-muted-foreground">
						Everything you need to know about Mockzilla
					</p>
				</div>

				<Accordion type="single" collapsible className="w-full">
					{faqs.map((faq) => (
						<AccordionItem key={faq.question} value={faq.question}>
							<AccordionTrigger className="text-left text-foreground">
								{faq.question}
							</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">
								{faq.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
