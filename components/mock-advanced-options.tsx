'use client';

import { Plus, X } from 'lucide-react';
import { FieldTooltip } from '@/components/folder-tooltips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { HttpMethod } from '@/lib/types';

export type QueryParamField = {
	id: string;
	key: string;
	value: string;
};

type AdvancedOptionsProps = {
	method: HttpMethod;
	queryParams: QueryParamField[];
	onQueryParamsChange: (params: QueryParamField[]) => void;
	echoRequestBody: boolean;
	onEchoRequestBodyChange: (value: boolean) => void;
	delay: string;
	onDelayChange: (value: string) => void;
	proxyTargetUrl: string;
	onProxyTargetUrlChange: (value: string) => void;
};

const createQueryParamId = () => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `query-param-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function AdvancedOptions({
	method,
	queryParams,
	onQueryParamsChange,
	echoRequestBody,
	onEchoRequestBodyChange,
	delay,
	onDelayChange,
	proxyTargetUrl,
	onProxyTargetUrlChange,
}: AdvancedOptionsProps) {
	const isEchoMethod = ['POST', 'PUT', 'PATCH'].includes(method);

	const addParam = () => {
		onQueryParamsChange([
			...queryParams,
			{ id: createQueryParamId(), key: '', value: '' },
		]);
	};

	const removeParam = (index: number) => {
		onQueryParamsChange(queryParams.filter((_, i) => i !== index));
	};

	const updateParam = (
		index: number,
		field: 'key' | 'value',
		value: string,
	) => {
		const updated = [...queryParams];
		updated[index] = { ...updated[index], [field]: value };
		onQueryParamsChange(updated);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold">Advanced Options</h2>
				<p className="text-sm text-muted-foreground">
					Configure request matching and delivery behavior.
				</p>
			</div>

			<div className="space-y-6 rounded-lg border border-border bg-card p-4 sm:p-6">
				<section className="space-y-3">
					<div className="flex items-center gap-2">
						<Label className="text-base font-semibold">Query Parameters</Label>
						<FieldTooltip
							label="Required Query Params"
							description="The mock only matches when every configured query parameter has the expected value."
							example="?page=1&limit=10"
							docsLink="/docs/reference/routing-and-matching#query-parameters"
						/>
					</div>
					{queryParams.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No query parameters required. This mock matches any query string.
						</p>
					) : (
						<div className="space-y-2">
							{queryParams.map((param, index) => (
								<div
									key={param.id}
									className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_2.25rem] items-center gap-2"
								>
									<Input
										placeholder="key"
										value={param.key}
										onChange={(event) =>
											updateParam(index, 'key', event.target.value)
										}
										className="min-w-0 font-mono text-sm"
									/>
									<span className="text-muted-foreground">=</span>
									<Input
										placeholder="value"
										value={param.value}
										onChange={(event) =>
											updateParam(index, 'value', event.target.value)
										}
										className="min-w-0 font-mono text-sm"
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => removeParam(index)}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					)}
					<Button type="button" variant="outline" size="sm" onClick={addParam}>
						<Plus className="mr-1 h-3 w-3" />
						Add Query Param
					</Button>
				</section>

				<section className="space-y-3 border-t border-border pt-6">
					<div className="flex items-center gap-2">
						<Label htmlFor="create-delay" className="text-base font-semibold">
							Response Delay (ms)
						</Label>
						<FieldTooltip
							label="Response Delay"
							description="Wait before returning the configured response to simulate network latency."
							example="500"
							docsLink="/docs"
						/>
					</div>
					<Input
						id="create-delay"
						type="number"
						min="0"
						step="1"
						value={delay}
						onChange={(event) => onDelayChange(event.target.value)}
						placeholder="e.g., 500"
					/>
					<p className="text-xs text-muted-foreground">
						Simulate network latency or throttling in milliseconds.
					</p>
				</section>

				{isEchoMethod && (
					<section className="space-y-3 border-t border-border pt-6">
						<div className="flex items-start gap-3">
							<Switch
								id="echo-request-body"
								checked={echoRequestBody}
								onCheckedChange={onEchoRequestBodyChange}
							/>
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<Label
										htmlFor="echo-request-body"
										className="cursor-pointer text-base font-semibold"
									>
										Echo Request Body
									</Label>
									<FieldTooltip
										label="Echo Request Body"
										description="Return the request body exactly as the response. A matching wildcard variant takes precedence over echo."
										example='POST {"name":"Alice"} → {"name":"Alice"}'
										docsLink="/docs"
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									A configured wildcard variant overrides echo for its capture
									key.
								</p>
							</div>
						</div>
					</section>
				)}

				<section className="space-y-3 border-t border-border pt-6">
					<div className="flex items-center gap-2">
						<Label htmlFor="create-proxy" className="text-base font-semibold">
							Proxy Target URL
						</Label>
						<span className="text-xs text-muted-foreground">Optional</span>
					</div>
					<Input
						id="create-proxy"
						value={proxyTargetUrl}
						onChange={(event) => onProxyTargetUrlChange(event.target.value)}
						placeholder="https://api.example.com/v1/users"
						className="font-mono text-sm"
					/>
					<p className="text-xs text-muted-foreground">
						Proxy to this URL while preserving incoming query parameters.
					</p>
				</section>
			</div>
		</div>
	);
}
