import { ChromeExtension } from '@/components/landing/ChromeExtension';
import { FAQ } from '@/components/landing/FAQ';
import { Features } from '@/components/landing/Features';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { HttpServer } from '@/components/landing/HttpServer';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { MCPSection } from '@/components/landing/MCPSection';
import { QuickInstall } from '@/components/landing/QuickInstall';
import { faqs } from '@/lib/constants/faq';
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
	title: 'Mockzilla | Self-Hosted API Mock Server',
	description:
		'Self-host Mockzilla for static and dynamic API responses with JSON Schema, Faker.js, and MCP. Official Docker image: andrecrjr/mockzilla.',
	keywords: [
		'Mockzilla API mock server',
		'self-hosted API mocking',
		'Docker mock server',
		'dynamic API mocks',
		'JSON Schema API mocks',
		'andrecrjr/mockzilla',
	],
	alternates: { canonical: '/' },
	openGraph: {
		title: 'Mockzilla — Self-Hosted API Mock Server',
		description:
			'Static and dynamic API mocks with JSON Schema, Faker.js, and MCP. Run this project with its official Docker image, andrecrjr/mockzilla.',
		url: 'https://mockzilla.dev/',
		siteName: 'Mockzilla',
		images: ['/mockzilla-logo.png'],
		locale: 'en_US',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Mockzilla — Self-Hosted API Mock Server',
		description:
			'Self-host Mockzilla for dynamic API mocks. Official Docker image: andrecrjr/mockzilla.',
		images: ['/mockzilla-logo.png'],
	},
};

export default function LandingPage() {
	const softwareAppJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Mockzilla',
		operatingSystem: 'Any',
		applicationCategory: 'DeveloperApplication',
		description:
			'Self-hosted API mocking platform for static and JSON Schema generated responses, with MCP tooling and Chrome extension interception. Official Docker image: andrecrjr/mockzilla.',
		url: 'https://mockzilla.dev/',
		sameAs: ['https://github.com/andrecrjr/mockzilla'],
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
		},
		featureList: [
			'JSON Schema + Faker.js interpolation',
			'Chrome Extension interception',
			'Model Context Protocol (MCP) integration',
			'Static and dynamic responses',
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
			<Script
				src="https://www.googletagmanager.com/gtag/js?id=G-6MNRG3E8GZ"
				strategy="afterInteractive"
			/>
			<Script id="google-analytics" strategy="afterInteractive">
				{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', 'G-6MNRG3E8GZ');
        `}
			</Script>
			<Script
				id="software-app-jsonld"
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
			/>
			<Script
				id="faq-jsonld"
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
		</div>
	);
}
