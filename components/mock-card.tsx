'use client';

import { Copy, ExternalLink, Pencil, CopyPlus } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { MockDeleteButton } from '@/components/mock-delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Folder, Mock, UpdateMockRequest } from '@/lib/types';
import { openUrlInNewContext } from '@/lib/utils/open-url';

interface MockCardProps {
	mock: Mock;
	folder?: Folder;
	onDelete: (id: string) => void;
	onDuplicate?: (mock: Mock) => void;
	onUpdate: (id: string, data: UpdateMockRequest) => Promise<void>;
	onCopy: (text: string) => void;
}

export function MockCard({ mock, folder, onDelete, onDuplicate, onUpdate, onCopy }: MockCardProps) {
	const [editedPath, setEditedPath] = useState(mock.path);

	useEffect(() => {
		setEditedPath(mock.path);
	}, [mock.path]);

	const handleSavePath = async () => {
		let newPath = editedPath.trim();
		
		// Remove trailing slash if it exists and path is not just "/"
		if (newPath.length > 1 && newPath.endsWith('/')) {
			newPath = newPath.slice(0, -1);
		}

		if (newPath !== mock.path && newPath !== '') {
			try {
				const updateData: UpdateMockRequest = {
					name: mock.name,
					path: newPath,
					method: mock.method,
					response: mock.response,
					statusCode: mock.statusCode,
					matchType: mock.matchType,
					bodyType: mock.bodyType,
					enabled: mock.enabled,
					queryParams: mock.queryParams,
					variants: mock.variants,
					wildcardRequireMatch: mock.wildcardRequireMatch,
					jsonSchema: mock.jsonSchema,
					useDynamicResponse: mock.useDynamicResponse,
					echoRequestBody: mock.echoRequestBody,
					delay: mock.delay,
					mockFolderId: mock.mockFolderId,
				};
				await onUpdate(mock.id, updateData);
			} catch (_error) {
				setEditedPath(mock.path);
			}
		} else {
			setEditedPath(mock.path);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.currentTarget.blur();
		} else if (e.key === 'Escape') {
			setEditedPath(mock.path);
			e.currentTarget.blur();
		}
	};

	const getMockUrl = (folderSlug: string, path: string) => {
		if (typeof window !== 'undefined') {
			return `${window.location.origin}/api/mock/${folderSlug}${path}`;
		}
		return `/api/mock/${folderSlug}${path}`;
	};

	const getQueryParamsString = () => {
		const qp = mock.queryParams as Record<string, string> | null | undefined;
		if (!qp || Object.keys(qp).length === 0) return '';
		return (
			'?' +
			Object.entries(qp)
				.map(([k, v]) => `${k}=${v}`)
				.join('&')
		);
	};

	const getStatusCodeColor = (code: number) => {
		if (code >= 200 && code < 300) {
			return 'bg-green-500/10 text-green-600 dark:text-green-400';
		}
		if (code >= 400 && code < 500) {
			return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
		}
		return 'bg-red-500/10 text-red-600 dark:text-red-400';
	};

	const getMethodColor = (method: string) => {
		switch (method) {
			case 'GET':
				return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
			case 'POST':
				return 'bg-green-500/10 text-green-600 dark:text-green-400';
			case 'PUT':
				return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
			case 'PATCH':
				return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
			default:
				return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
		}
	};

	const effectivePath = mock.effectivePath || mock.path;
	const relativePath = mock.relativePath || mock.path;
	const subfolderPrefix =
		effectivePath !== relativePath && effectivePath.endsWith(relativePath)
			? effectivePath.slice(0, -relativePath.length) || '/'
			: '';
	const mockUrl = getMockUrl(folder?.slug || '', effectivePath);
	const queryParamsString = getQueryParamsString();
	const mockUrlFull = queryParamsString
		? `${mockUrl}${queryParamsString}`
		: mockUrl;

	return (
		<Card className="border-border bg-card p-6 transition-colors hover:bg-accent/5">
			<div className="min-w-0 space-y-4">
				<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div className="min-w-0 flex-1">
						<h3 className="truncate font-semibold text-card-foreground">
							{mock.name}
						</h3>
						<div className="mt-2 flex flex-wrap items-center gap-2">
							<span
								className={`inline-block rounded px-2 py-1 text-xs font-medium ${getMethodColor(mock.method)}`}
							>
								{mock.method}
							</span>
							<span
								className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusCodeColor(mock.statusCode)}`}
							>
								{mock.statusCode}
							</span>
							<Badge variant="outline" className="text-xs">
								{mock.matchType || 'exact'}
							</Badge>
							{(mock.meta as { proxyTargetUrl?: string })?.proxyTargetUrl && (
								<Badge
									variant="secondary"
									className="max-w-full truncate border-blue-500/20 bg-blue-500/10 text-xs text-blue-600 dark:text-blue-400"
									title={(mock.meta as { proxyTargetUrl?: string }).proxyTargetUrl}
								>
									Proxy: {(mock.meta as { proxyTargetUrl?: string }).proxyTargetUrl}
								</Badge>
							)}
							{mock.matchType === 'wildcard' &&
								mock.variants &&
								mock.variants.length > 0 && (
									<Badge variant="secondary" className="text-xs">
										{mock.variants.length} variant
										{mock.variants.length > 1 ? 's' : ''}
									</Badge>
								)}
						</div>
						<div className="mt-2 flex h-7 min-w-0 max-w-full items-center rounded border border-transparent bg-muted px-2 focus-within:border-ring/50 focus-within:ring-1 focus-within:ring-ring/50">
							<span className="min-w-0 shrink truncate text-sm font-mono text-muted-foreground/60 select-none">
								/{folder?.slug}
								{subfolderPrefix}
							</span>
							<Input
								value={editedPath}
								onChange={(e) => setEditedPath(e.target.value)}
								onBlur={handleSavePath}
								onKeyDown={handleKeyDown}
								className="h-full min-w-[6rem] flex-1 border-0 bg-transparent px-1 font-mono text-sm text-muted-foreground shadow-none focus-visible:ring-0"
								title="Edit path directly"
							/>
						</div>
						{queryParamsString && (
							<div className="mt-2 flex min-w-0 flex-wrap items-center gap-1">
								<span className="text-xs text-muted-foreground">
									Required params:
								</span>
								{Object.entries(mock.queryParams as Record<string, string>).map(
									([key, value]) => (
										<Badge
											key={key}
											variant="secondary"
											className="max-w-full truncate text-xs"
											title={`${key}=${value}`}
										>
											{key}={value}
										</Badge>
									),
								)}
							</div>
						)}
					</div>
					<div className="flex shrink-0 gap-1">
						{onDuplicate && (
							<Button
								variant="ghost"
								size="icon"
								onClick={() => onDuplicate(mock)}
								title="Duplicate Mock"
							>
								<CopyPlus className="h-4 w-4" />
							</Button>
						)}
						<Button variant="ghost" size="icon" asChild>
							<Link href={`/app/folder/${folder?.slug}/mock/${mock.id}`}>
								<Pencil className="h-4 w-4" />
							</Link>
						</Button>
						<MockDeleteButton
							mockId={mock.id}
							mockName={mock.name}
							onDelete={onDelete}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label className="text-xs text-muted-foreground">Mock URL</Label>
					<div className="flex min-w-0 gap-2">
						<Input
							value={mockUrlFull}
							readOnly
							className="h-9 min-w-0 flex-1 border-input bg-muted/50 px-3 font-mono text-sm text-muted-foreground"
						/>
						<Button
							variant="outline"
							size="icon"
							onClick={() => onCopy(mockUrlFull)}
						>
							<Copy className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => void openUrlInNewContext(mockUrlFull)}
						>
							<ExternalLink className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
		</Card>
	);
}
