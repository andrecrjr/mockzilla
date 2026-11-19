'use client';

import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { FieldTooltip } from '@/components/folder-tooltips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
	isSensitiveName,
	validateProxyHeaderName,
	validateProxyTargetUrl,
} from '@/lib/utils/proxy-record';

export type KeyValueField = {
	id: string;
	key: string;
	value: string;
};

export type ProxyOptionsValue = {
	targetUrl: string;
	headers: KeyValueField[];
	queryParams: KeyValueField[];
	forwardHeaders: boolean;
};

type ProxyOptionsProps = {
	value: ProxyOptionsValue;
	onChange: (value: ProxyOptionsValue) => void;
};

export const createKeyValueId = () => {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

type KeyValueRowsProps = {
	rows: KeyValueField[];
	onChange: (rows: KeyValueField[]) => void;
	keyPlaceholder: string;
	valuePlaceholder: string;
	addLabel: string;
	emptyText: string;
	maskSensitive?: boolean;
	validateKey?: (key: string) => string | null;
	ariaPrefix: string;
};

function KeyValueRows({
	rows,
	onChange,
	keyPlaceholder,
	valuePlaceholder,
	addLabel,
	emptyText,
	maskSensitive = false,
	validateKey,
	ariaPrefix,
}: KeyValueRowsProps) {
	const [revealed, setRevealed] = useState<Record<string, boolean>>({});

	const update = (index: number, field: 'key' | 'value', next: string) => {
		const updated = [...rows];
		updated[index] = { ...updated[index], [field]: next };
		onChange(updated);
	};

	return (
		<div className="space-y-2">
			{rows.length === 0 && (
				<p className="text-xs text-muted-foreground">{emptyText}</p>
			)}
			{rows.map((row, index) => {
				const keyError = validateKey?.(row.key) ?? null;
				const isSensitive = maskSensitive && isSensitiveName(row.key);
				const isHidden = isSensitive && !revealed[row.id];
				return (
					<div key={row.id} className="space-y-1">
						<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_2.25rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto_2.25rem]">
							<Input
								placeholder={keyPlaceholder}
								value={row.key}
								onChange={(event) => update(index, 'key', event.target.value)}
								aria-label={`${ariaPrefix} name ${index + 1}`}
								aria-invalid={Boolean(keyError)}
								autoComplete="off"
								className="min-w-0 font-mono text-sm"
							/>
							<Input
								placeholder={valuePlaceholder}
								value={row.value}
								type={isHidden ? 'password' : 'text'}
								onChange={(event) => update(index, 'value', event.target.value)}
								aria-label={`${ariaPrefix} value ${index + 1}`}
								autoComplete="off"
								className="min-w-0 font-mono text-sm"
							/>
							{isSensitive ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() =>
										setRevealed((current) => ({
											...current,
											[row.id]: !current[row.id],
										}))
									}
									aria-label={isHidden ? 'Show value' : 'Hide value'}
									title={isHidden ? 'Show value' : 'Hide value'}
								>
									{isHidden ? (
										<Eye className="h-4 w-4" />
									) : (
										<EyeOff className="h-4 w-4" />
									)}
								</Button>
							) : (
								<span className="hidden sm:block" />
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => onChange(rows.filter((_, i) => i !== index))}
								aria-label={`Remove ${ariaPrefix.toLowerCase()} ${index + 1}`}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						{keyError && (
							<p className="text-xs text-destructive" role="alert">
								{keyError}
							</p>
						)}
					</div>
				);
			})}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() =>
					onChange([...rows, { id: createKeyValueId(), key: '', value: '' }])
				}
			>
				<Plus className="mr-1 h-3 w-3" />
				{addLabel}
			</Button>
		</div>
	);
}

/** Proxy & Record target plus the headers and query params sent upstream. */
export function ProxyOptions({ value, onChange }: ProxyOptionsProps) {
	const proxyError = validateProxyTargetUrl(value.targetUrl);
	const isOn = value.targetUrl.trim().length > 0;
	const patch = (changes: Partial<ProxyOptionsValue>) =>
		onChange({ ...value, ...changes });

	return (
		<section className="space-y-4 border-t border-border pt-6">
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Label htmlFor="create-proxy" className="text-base font-semibold">
						Proxy & Record
					</Label>
					<span className="text-xs text-muted-foreground">Optional</span>
					<FieldTooltip
						label="Proxy & Record"
						description="Matching requests are forwarded to this URL. Each new path + query combination is saved as an exact mock in this folder, and identical requests are then served from that recording."
						example="https://api.example.com/v1/users/* → * is replaced by the wildcard capture"
						docsLink="/docs/guides/proxy-and-record"
					/>
				</div>
				<Input
					id="create-proxy"
					value={value.targetUrl}
					onChange={(event) => patch({ targetUrl: event.target.value })}
					placeholder="https://api.example.com/v1/users"
					className="font-mono text-sm"
					aria-invalid={Boolean(proxyError)}
					aria-describedby="create-proxy-help"
				/>
				{proxyError ? (
					<p
						id="create-proxy-help"
						className="text-xs text-destructive"
						role="alert"
					>
						{proxyError}
					</p>
				) : (
					<div
						id="create-proxy-help"
						className="space-y-1 text-xs text-muted-foreground"
					>
						<p>
							Requests go to this exact URL (the mock path is not appended) with
							the incoming method, body, and query string. Use{' '}
							<code className="font-mono">*</code> to insert a wildcard capture,
							e.g. <code className="font-mono">/users/*</code>.
						</p>
						{isOn && (
							<p className="text-blue-600 dark:text-blue-400">
								Recording is on: the first request for each path + query is
								saved as a “Recorded:” mock in this folder; repeats are served
								from it.
							</p>
						)}
					</div>
				)}
			</div>

			{isOn && (
				<>
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Label className="text-sm font-semibold">Upstream headers</Label>
							<FieldTooltip
								label="Upstream headers"
								description="Sent with every proxied request and replacing any incoming header of the same name. Use it to add Authorization, API keys, or a custom Accept without changing your app."
								example="Authorization: Bearer <token>"
								docsLink="/docs/guides/proxy-and-record"
							/>
						</div>
						<KeyValueRows
							rows={value.headers}
							onChange={(headers) => patch({ headers })}
							keyPlaceholder="Authorization"
							valuePlaceholder="Bearer …"
							addLabel="Add header"
							emptyText="No extra headers. Incoming request headers are forwarded as they are."
							maskSensitive
							validateKey={validateProxyHeaderName}
							ariaPrefix="Header"
						/>
						<div className="flex items-start gap-3 pt-1">
							<Switch
								id="proxy-forward-headers"
								checked={value.forwardHeaders}
								onCheckedChange={(forwardHeaders) => patch({ forwardHeaders })}
							/>
							<div className="space-y-0.5">
								<Label
									htmlFor="proxy-forward-headers"
									className="cursor-pointer text-sm font-medium"
								>
									Also forward the caller's headers
								</Label>
								<p className="text-xs text-muted-foreground">
									{value.forwardHeaders
										? 'Incoming headers (cookies, auth, accept…) are sent too; the headers above replace matching ones.'
										: 'Only the headers above are sent upstream. Use this to keep browser cookies and tokens from reaching the API.'}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Label className="text-sm font-semibold">
								Upstream query parameters
							</Label>
							<FieldTooltip
								label="Upstream query parameters"
								description="Added to every proxied request and replacing an incoming param of the same name. They are not part of the recording's match key."
								example="api_key=… or version=2"
								docsLink="/docs/guides/proxy-and-record"
							/>
						</div>
						<KeyValueRows
							rows={value.queryParams}
							onChange={(queryParams) => patch({ queryParams })}
							keyPlaceholder="api_key"
							valuePlaceholder="value"
							addLabel="Add parameter"
							emptyText="No extra parameters. The incoming query string is forwarded as it is."
							maskSensitive
							ariaPrefix="Parameter"
						/>
					</div>

					<p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
						Header and parameter values are stored with the mock and appear in
						exports and API responses. Use test credentials, or a token you can
						revoke.
					</p>
				</>
			)}
		</section>
	);
}

/** Converts key/value rows to a record, skipping rows without a name. */
export function keyValueRowsToRecord(
	rows: KeyValueField[],
): Record<string, string> | undefined {
	const entries = rows
		.map((row) => [row.key.trim(), row.value] as const)
		.filter(([key]) => key.length > 0);
	return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function recordToKeyValueRows(
	record: unknown,
	idPrefix: string,
): KeyValueField[] {
	if (!record || typeof record !== 'object' || Array.isArray(record)) return [];
	return Object.entries(record as Record<string, unknown>).map(
		([key, value], index) => ({
			id: `${idPrefix}-${index}`,
			key,
			value: String(value ?? ''),
		}),
	);
}
