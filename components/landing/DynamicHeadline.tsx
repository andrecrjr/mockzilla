'use client';

import { useEffect, useState } from 'react';

const headlines = [
	'🚀 Mock APIs in 30 Seconds',
	"🤖 Your QA Team's Best Friend",
	'⚡ Stop Waiting for Backend Teams',
	'🎯 Test Any API Response Instantly',
	'🔨 Build Faster with Realistic Mocks',
	"💻 Your Frontend Team's Best Friend",
	"🛠️ Your Backend Team's Best Friend",
	'🌐 Deploy Your Mock Server Now',
	'🔄 Intercept Requests in Real-Time',
	'✨ Ship Features Without Backend Delays',
	'⚡ Prototype at Lightning Speed',
	'🚫 Never Block on APIs Again',
	'🎬 From Zero to Mocking in Seconds',
	'🎛️ Your Backend, Your Rules',
	'🧠 AI-Powered Mock Generation',
];

export function DynamicHeadline() {
	const [headlineIndex, setHeadlineIndex] = useState(0);
	const [isFading, setIsFading] = useState(false);

	useEffect(() => {
		const interval = setInterval(() => {
			setIsFading(true);
			setTimeout(() => {
				setHeadlineIndex((prev) => {
					let newIndex: number;
					do {
						newIndex = Math.floor(Math.random() * headlines.length);
					} while (newIndex === prev);
					return newIndex;
				});
				setIsFading(false);
			}, 300);
		}, 7000);

		return () => clearInterval(interval);
	}, []);

	return (
		<span
			className={`transition-opacity duration-300 ease-in-out ${
				isFading ? 'opacity-0' : 'opacity-100'
			}`}
		>
			{headlines[headlineIndex]}
		</span>
	);
}
