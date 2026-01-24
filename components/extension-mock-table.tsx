'use client';

import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

interface ExtensionMock {
	id: string;
	name: string;
	method: string;
	statusCode: number;
	enabled: boolean;
	variants?: Array<{
		id: string;
		name: string;
		statusCode: number;
	}>;
}

interface ExtensionMockTableProps {
	mocks: ExtensionMock[];
}

export function ExtensionMockTable({ mocks }: ExtensionMockTableProps) {
	if (!mocks || mocks.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				No mocks found in this extension folder.
			</div>
		);
	}

	return (
		<div className="rounded-md border bg-card/50 backdrop-blur-sm">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Method</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Variants</TableHead>
						<TableHead className="text-right">Enabled</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{mocks.map((mock) => (
						<TableRow key={mock.id}>
							<TableCell className="font-medium">{mock.name}</TableCell>
							<TableCell>
								<Badge variant="outline">{mock.method}</Badge>
							</TableCell>
							<TableCell>
								<span className={`font-mono ${mock.statusCode >= 400 ? 'text-destructive' : 'text-green-600'}`}>
									{mock.statusCode}
								</span>
							</TableCell>
							<TableCell>
								{mock.variants && mock.variants.length > 0 ? (
									<div className="flex flex-col gap-1">
										{mock.variants.map((v, idx) => (
											<div key={v.id || `variant-${idx}`} className="text-xs text-muted-foreground flex items-center gap-2">
												<span>• {v.name}</span>
												<span className="text-[10px] bg-secondary px-1 rounded">{v.statusCode}</span>
											</div>
										))}
									</div>
								) : (
									<span className="text-muted-foreground text-xs">-</span>
								)}
							</TableCell>
							<TableCell className="text-right">
								{mock.enabled ? (
									<div className="flex justify-end">
										<div className="bg-green-500/10 text-green-500 p-1 rounded-full">
											<Check className="h-4 w-4" />
										</div>
									</div>
								) : (
									<div className="flex justify-end">
										<div className="bg-destructive/10 text-destructive p-1 rounded-full">
											<X className="h-4 w-4" />
										</div>
									</div>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
