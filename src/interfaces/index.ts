export interface IQueryInterface {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
	searchTerm?: string;

	// any other query parameters can be added here
	[key: string]: any;
}
