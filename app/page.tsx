import { FAQ } from '@/components/landing/FAQ';
import { Features } from '@/components/landing/Features';
import { Hero } from '@/components/landing/Hero';
import { HttpServer } from '@/components/landing/HttpServer';
import { ChromeExtension } from '@/components/landing/ChromeExtension';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { MCPSection } from '@/components/landing/MCPSection';
import { QuickInstall } from '@/components/landing/QuickInstall';
import { faqs } from '@/lib/constants/faq';

export default function LandingPage() {
	const softwareAppJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Mockzilla',
		operatingSystem: 'Any',
		applicationCategory: 'DeveloperApplication',
		description:
			'Chrome Extension for instant interception. HTTP Server for dynamic mocking. JSON Schema + Faker, MCP integration, and stateful workflows.',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
		},
		featureList: [
			'JSON Schema + Faker.js interpolation',
			'Chrome Extension interception',
			'Model Context Protocol (MCP) integration',
			'Stateful workflow scenarios',
			'Docker-based deployment',
		],
	};

	const faqJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((faq) => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer,
			},
		})),
	};

	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen flex flex-col">
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
			/>
			<LandingNavbar />
			<main className="flex-1">
				<Hero />
				<QuickInstall />
				<HttpServer />
				<ChromeExtension />
				<Features />
				<HowItWorks />
				<MCPSection />
				<FAQ />
			</main>
			<LandingFooter />
		</div>
	);
}
