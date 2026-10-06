# Oracle: dictionary dig

`SELECT` only. Always. No writes, no DDL, no job runs.

## What this source holds

1. Object past: `ALL_OBJECTS` holds `created` and `last_ddl_time` per object.
2. Object text: `ALL_SOURCE` holds procedure, function, package, trigger text.
3. Stated intent: `ALL_TAB_COMMENTS` and `ALL_COL_COMMENTS` hold table and column notes.
4. Shape links: `ALL_DEPENDENCIES` holds which object leans on which.
5. Header notes: comment blocks at the top of stored code often hold dates or ticket references.

Best at age and links: when the object last changed, what it touches, what the notes claim.

## How to dig

1. Find the object and its age:

```sql
SELECT object_name, object_type, created, last_ddl_time, status
FROM all_objects
WHERE object_name = '<NAME>';
```

2. Read the stored text around the target lines:

```sql
SELECT line, text
FROM all_source
WHERE name = '<NAME>' AND type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE', 'TRIGGER')
ORDER BY line;
```

3. Read the table and column notes:

```sql
SELECT table_name, comments FROM all_tab_comments WHERE table_name = '<NAME>';
SELECT table_name, column_name, comments FROM all_col_comments WHERE table_name = '<NAME>';
```

4. Map what leans on it and what it leans on:

```sql
SELECT name, type, referenced_name, referenced_type
FROM all_dependencies
WHERE name = '<NAME>' OR referenced_name = '<NAME>';
```

5. Read header comment blocks for dates or ticket references. Quote them verbatim.
6. Search names with `LIKE '<PART>%'` when the exact name is unsure. Go wide first.

## Hard rules

1. `SELECT` only. Never INSERT, UPDATE, DELETE, MERGE, DDL, or job runs.
2. SELECT on any connection, production included, is allowed (`../../../jstack/biblioteca/autonomia.md`, Just do it). Writes are never allowed.
3. Cite the view, the object name, and the query run.

## Strong proof here

1. A header comment naming the ticket and the motive.
2. A column note stating the bound and its source.
3. A `last_ddl_time` that lines up with a commit or ticket date.
4. A dependency row showing the target guards a named upstream fault.

## Traps

1. Fresh stamp, old motive. A recompile moves `last_ddl_time` without changing intent.
2. Empty notes. Most objects lack comments. Empty is a gap, not a no.
3. Name drift. The code name and the stored name may differ by prefix or case. Check both.
4. Text is not motive. Stored code shows conduct. Motive needs notes, headers, dates.

## What to return

Each row or block that touches the question, with view, object, exact text, dates, the query run, and the label `medido` (states why) or `inferido` (hints why). Plus the queries run and the empty ones.
