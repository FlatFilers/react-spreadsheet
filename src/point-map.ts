/**
 * Immutable unordered Map like interface of point to value pairs.
 *
 */
import { IPoint } from "./types";

export type PointMap<T> = {
  [row: number]: {
    [column: number]: T;
  };
};

/** Sets the value for point in map */
export function set<T>(point: IPoint, value: T, map: PointMap<T>): PointMap<T> {
  return {
    ...map,
    [point.row]: {
      ...map[point.row],
      [point.column]: value
    }
  };
}

export function unset<T>(
  { row, column }: IPoint,
  map: PointMap<T>
): PointMap<T> {
  if (!(row in map) || !(column in map[row])) {
    return map;
  }
  const {
    [row]: { [column]: _, ...nextRow },
    ...nextMap
  } = map;
  if (Object.keys(nextRow).length === 0) {
    return nextMap;
  }
  return { ...nextMap, [row]: nextRow };
}

/** Gets the value for point in map */
export function get<T>(point: IPoint, map: PointMap<T>): typeof undefined | T {
  return map[point.row] && map[point.row][point.column];
}

/** Checks if map has point assigned to value */
export function has<T>(point: IPoint, map: PointMap<T>): boolean {
  return point.row in map && point.column in map[point.row];
}

export function getRow<T>(row: number, map: PointMap<T>): T[] {
  return row in map
    ? Object.keys(map[row]).map((column: any) => map[row][column])
    : [];
}

export function getColumn<T>(column: number, map: PointMap<T>): T[] {
  return Object.keys(map).map((row: any) => map[row][column]);
}

const EMPTY: PointMap<any> = {};

/** Creates a new PointMap instance from an array-like or iterable object. */
export function from<T>(pairs: Array<[IPoint, T]>): PointMap<T> {
  return pairs.reduce((acc, [point, value]) => set(point, value, acc), EMPTY);
}

/** Returns the number of elements in a PointMap object. */
export function size(map: PointMap<any>): number {
  let acc = 0;
  // tslint:disable-next-line:variable-name
  const _map_keys = Object.keys(map);
  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < _map_keys.length; i++) {
    const row = Number(_map_keys[i]);
    const columns = map[row];
    acc += Object.keys(columns).length;
  }
  return acc;
}

/*
 * Applies a function against an accumulator and each value
 * and point in the map (from left to right) to reduce it to a single value
 */
export function reduce<A, T>(
  func: (_: A, value: T, point: IPoint) => A,
  map: PointMap<T>,
  initialValue: A
): A {
  let acc = initialValue;
  // tslint:disable-next-line:variable-name
  const _map_keys = Object.keys(map);
  // tslint:disable-next-line:prefer-for-of
  for (let i = 0; i < _map_keys.length; i++) {
    const row = Number(_map_keys[i]);
    const columns = map[row];
    // tslint:disable-next-line:variable-name
    const _columns_keys = Object.keys(columns);
    // tslint:disable-next-line:prefer-for-of
    for (let j = 0; j < _columns_keys.length; j++) {
      const column = Number(_columns_keys[j]);
      const value = columns[column];
      acc = func(acc, value, { row, column });
    }
  }
  return acc;
}

/** Creates a new map with the results of calling a provided function on every value in the calling map */
export function map<T1, T2>(
  func: (_: T1) => T2,
  map: PointMap<T1>
): PointMap<T2> {
  return reduce(
    (acc, value, point) => set(point, func(value), acc),
    map,
    from([])
  );
}

/*
 * Creates a new map of all values predicate returns truthy for.
 * The predicate is invoked with two arguments: (value, key)
 */
export function filter<T>(
  predicate: (_: T, __: IPoint) => boolean,
  map: PointMap<T>
): PointMap<T> {
  return reduce(
    (acc, value, point) => {
      if (predicate(value, point)) {
        return set(point, value, acc);
      }
      return acc;
    },
    map,
    from([])
  );
}

/** Returns whether map has any points set to value */
export function isEmpty(map: PointMap<any>): boolean {
  return Object.keys(map).length === 0;
}
