import {
  Column,
  inArray as drizzleInArray,
  notInArray as drizzleNotInArray,
  is,
  type SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm";

function oneParameter(left: SQLWrapper, values: readonly unknown[]): SQL {
  const driverValues = is(left, Column)
    ? values.map((value) => left.mapToDriverValue(value))
    : values;
  return sql`(select value from json_each(${JSON.stringify(driverValues)}))`;
}

export const inArray = ((left: SQLWrapper, values: readonly unknown[] | SQLWrapper) =>
  Array.isArray(values) && values.length > 0
    ? sql`${left} in ${oneParameter(left, values)}`
    : drizzleInArray(left as SQL, values as SQLWrapper)) as typeof drizzleInArray;

export const notInArray = ((left: SQLWrapper, values: readonly unknown[] | SQLWrapper) =>
  Array.isArray(values) && values.length > 0
    ? sql`${left} not in ${oneParameter(left, values)}`
    : drizzleNotInArray(left as SQL, values as SQLWrapper)) as typeof drizzleNotInArray;
