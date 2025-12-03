'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface PaginationControlsProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	limit: number;
	onLimitChange: (limit: number) => void;
	totalItems: number;
}

export function PaginationControls({
	currentPage,
	totalPages,
	onPageChange,
	limit,
	onLimitChange,
	totalItems,
}: PaginationControlsProps) {
	return (
		<div className="flex items-center justify-between px-2 py-4">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span>Rows per page</span>
				<Select
					value={limit.toString()}
					onValueChange={(value) => onLimitChange(Number(value))}
				>
					<SelectTrigger className="h-8 w-[70px]">
						<SelectValue placeholder={limit} />
					</SelectTrigger>
					<SelectContent side="top">
						{[5, 10, 20, 30, 40, 50, 60].map((pageSize) => (
							<SelectItem key={pageSize} value={`${pageSize}`}>
								{pageSize}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<span>
					Page {currentPage} of {totalPages || 1} ({totalItems} items)
				</span>
			</div>
			<div className="flex items-center space-x-2">
				<Button
					variant="outline"
					className="h-8 w-8 p-0"
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage <= 1}
				>
					<span className="sr-only">Go to previous page</span>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					className="h-8 w-8 p-0"
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage >= totalPages}
				>
					<span className="sr-only">Go to next page</span>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
