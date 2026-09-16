export declare const RUNNER_TABLE: string;
export declare const FOREIGN_MIGRATION_JOURNALS: string[];

export declare function tablesCreatedByMigrations(
  sqlTexts: string[]
): Set<string>;

export declare function assessTenancy(input: {
  ownTables: Set<string>;
  publicTables: string[];
  allTables: { schema: string; table: string }[];
}): {
  shared: boolean;
  foreignTables: string[];
  foreignJournals: string[];
};
