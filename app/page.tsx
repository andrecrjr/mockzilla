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

export default function LandingPage() {
	return (
		<div className="mockzilla-gradient-light mockzilla-gradient-dark min-h-screen flex flex-col">
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
