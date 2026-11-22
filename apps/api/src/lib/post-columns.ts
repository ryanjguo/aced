import { getTableColumns, schema } from '@aced/db'

// The generated search vector is only for WHERE clauses; no response uses it, so don't load it.
const { searchVector: _, ...columns } = getTableColumns(schema.posts)
export const postColumns = columns
