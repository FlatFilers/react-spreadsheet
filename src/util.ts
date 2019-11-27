import { Matrix } from "./matrix";
import {
  CellBase,
  ICellDescriptor,
  IDimensions,
  IPoint,
  IStoreState
} from "./types";

import * as clipboard from "clipboard-polyfill";

export const moveCursorToEnd = (el: HTMLInputElement) => {
  el.selectionStart = el.selectionEnd = el.value.length;
};

/**
 * Creates an array of numbers (positive and/or negative) progressing from start up to, but not including, end.
 * A step of -1 is used if a negative start is specified without an end or step.
 * If end is not specified, it's set to start with start then set to 0.
 *
 * @param end
 * @param start
 * @param step
 */
export function range(
  end: number,
  start: number = 0,
  step: number = 1
): number[] {
  const array = [];
  if (Math.sign(end - start) === -1) {
    for (let element = start; element > end; element -= step) {
      array.push(element);
    }
    return array;
  }
  for (let element = start; element < end; element += step) {
    array.push(element);
  }
  return array;
}

export function updateData<Cell extends CellBase>(
  data: Matrix<Cell>,
  cellDescriptor: ICellDescriptor<Cell>
): Matrix<Cell> {
  const row = data[cellDescriptor.row];
  const nextData = [...data];
  const nextRow = row ? [...row] : [];
  nextRow[cellDescriptor.column] = cellDescriptor.data;
  nextData[cellDescriptor.row] = nextRow;
  return nextData;
}

export function setCell<Cell extends CellBase>(
  state: { data: Matrix<Cell> },
  active: IPoint,
  cell: Cell
): Matrix<Cell> {
  return updateData(state.data, {
    ...active,
    data: cell
  });
}

export function isActive(
  active: IStoreState<any>["active"],
  { row, column }: IPoint
): boolean {
  return Boolean(active && column === active.column && row === active.row);
}

export const getOffsetRect = (element: HTMLElement): IDimensions => ({
  width: element.offsetWidth,
  height: element.offsetHeight,
  left: element.offsetLeft,
  top: element.offsetTop
});

/**
 * @todo better error management
 */
/**
 * Wraps Clipboard.write() with permission check if necessary
 * @param data {string} - The string to be written to the clipboard.
 */
export const writeTextToClipboard = (data: string): void => {
  const write = () => {
    clipboard.writeText(data);
  };
  if (navigator.permissions) {
    navigator.permissions
      .query({
        name: "clipboard"
      })
      .then((readClipboardStatus: any) => {
        if (readClipboardStatus.state) {
          write();
        }
      });
  } else {
    write();
  }
};

export function createEmptyMatrix<T>(rows: number, columns: number): Matrix<T> {
  return range(rows).map(() => Array(columns));
}

export const getCellDimensions = (
  point: IPoint,
  state: IStoreState<any>
): IDimensions => {
  const rowDimensions = state.rowDimensions[point.row];
  const columnDimensions = state.columnDimensions[point.column];
  return (
    rowDimensions &&
    columnDimensions && { ...rowDimensions, ...columnDimensions }
  );
};
