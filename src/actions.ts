import { KeyboardEvent } from "react";

import {
  get as matrixGet,
  has as matrixHas,
  inclusiveRange,
  Matrix,
  set as matrixSet,
  unset as matrixUnset
} from "./matrix";
import {
  filter as pointMapFilter,
  from as pointMapFrom,
  map as pointMapMap,
  PointMap,
  reduce as pointMapReduce,
  set as pointMapSet
} from "./point-map";
import {
  add as pointSetAdd,
  extendEdge as pointSetExtendEdge,
  filter as pointSetFilter,
  from as pointSetFrom,
  has as pointSetHas,
  isEmpty as pointSetIsEmpty,
  min as pointSetMin,
  PointSet,
  reduce as pointSetReduce,
  shrinkEdge as pointSetShrinkEdge,
  toArray as pointSetToArray
} from "./point-set";
import {
  CellBase,
  CellChange,
  IDimensions,
  IPoint,
  IStoreState
} from "./types";
import { isActive, setCell, updateData } from "./util";

export type Action = <Cell extends CellBase>(
  state: IStoreState<Cell>,
  data: any,
  active?: any,
  selected?: PointSet,
  bindings?: PointSet,
  cellPointer?: IPoint
) => Partial<IStoreState<Cell>>;

export const setData: Action = (state, data: Matrix<any>) => {
  const nextActive =
    state.active && matrixHas(state.active.row, state.active.column, data)
      ? state.active
      : null;
  const nextSelected = pointSetFilter(
    point => matrixHas(point.row, point.column, data),
    state.selected
  );
  const nextBindings = pointMapMap(
    bindings =>
      pointSetFilter(
        point => matrixHas(point.row, point.column, data),
        bindings
      ),
    pointMapFilter(
      (_, point) => matrixHas(point.row, point.column, data),
      state.bindings
    )
  );
  return {
    data,
    active: nextActive,
    selected: nextSelected,
    bindings: nextBindings
  };
};

export const select: Action = (state: any, cellPointer: IPoint) => {
  if (state.active && !isActive(state.active, cellPointer)) {
    return {
      selected: pointSetFrom(
        inclusiveRange(
          { row: cellPointer.row, column: cellPointer.column },
          { row: state.active.row, column: state.active.column }
        )
      ),
      mode: "view"
    };
  }
  return null;
};

export const activate = (state: any, cellPointer: IPoint) => ({
  selected: pointSetFrom([cellPointer]),
  active: cellPointer,
  mode: isActive(state.active, cellPointer) ? "edit" : "view"
});

export function setCellData<Cell>(
  state: IStoreState<Cell>,
  active: IPoint,
  data: Cell,
  bindings: IPoint[]
): Partial<IStoreState<Cell>> {
  return {
    mode: "edit",
    data: setCell(state, active, data),
    lastChanged: active,
    bindings: pointMapSet(active, pointSetFrom(bindings), state.bindings)
  };
}

export function setCellDimensions(
  state: IStoreState<any>,
  point: IPoint,
  dimensions: IDimensions
): Partial<IStoreState<any>> | null {
  const prevRowDimensions = state.rowDimensions[point.row];
  const prevColumnDimensions = state.columnDimensions[point.column];
  if (
    prevRowDimensions &&
    prevColumnDimensions &&
    prevRowDimensions.top === dimensions.top &&
    prevRowDimensions.height === dimensions.height &&
    prevColumnDimensions.left === dimensions.left &&
    prevColumnDimensions.width === dimensions.width
  ) {
    return null;
  }
  return {
    rowDimensions: {
      ...state.rowDimensions,
      [point.row]: { top: dimensions.top, height: dimensions.height }
    },
    columnDimensions: {
      ...state.columnDimensions,
      [point.column]: { left: dimensions.left, width: dimensions.width }
    }
  };
}

export function copy<T>(state: IStoreState<T>) {
  return {
    copied: pointSetReduce(
      (acc, point) =>
        pointMapSet<T>(
          point,
          matrixGet<T>(point.row, point.column, state.data),
          acc
        ),
      state.selected,
      pointMapFrom<T>([])
    ),
    cut: false,
    hasPasted: false
  };
}

export const cut = (state: IStoreState<any>) => ({
  ...copy(state),
  cut: true
});

export function paste<Cell extends CellBase>(state: IStoreState<Cell>) {
  if (pointSetIsEmpty(state.copied)) {
    return null;
  }
  const minPoint = pointSetMin(state.copied);

  type Accumulator = {
    data: IStoreState<Cell>["data"];
    selected: IStoreState<Cell>["selected"];
    commit: IStoreState<Cell>["lastCommit"];
  };

  const { data, selected, commit } = pointMapReduce(
    (
      acc: Accumulator,
      value: CellChange<Cell>["prevCell"] | CellChange<Cell>["nextCell"],
      { row, column }
    ): any => {
      if (!state.active) {
        return acc;
      }

      let commit: IStoreState<Cell>["lastCommit"] = acc.commit || [];
      const nextRow = row - minPoint.row + state.active.row;
      const nextColumn = column - minPoint.column + state.active.column;

      const nextData = state.cut
        ? matrixUnset(row, column, acc.data)
        : acc.data;

      if (state.cut && commit) {
        commit = [...commit, { prevCell: value, nextCell: null }];
      }

      if (!matrixHas(nextRow, nextColumn, state.data)) {
        return { data: nextData, selected: acc.selected, commit };
      }

      if (commit) {
        commit = [
          ...commit,
          {
            prevCell: matrixGet(nextRow, nextColumn, nextData) as CellChange<
              Cell
            >["prevCell"],
            nextCell: value
          }
        ];
      }

      return {
        data: matrixSet(nextRow, nextColumn, value, nextData),
        selected: pointSetAdd(acc.selected, {
          row: nextRow,
          column: nextColumn
        }),
        commit
      };
    },
    state.copied as PointMap<any>,
    { data: state.data, selected: pointSetFrom([]), commit: [] }
  );
  return {
    data,
    selected,
    cut: false,
    hasPasted: true,
    mode: "view",
    lastCommit: commit
  };
}

export const edit = <Cell extends CellBase>(state: IStoreState<Cell>) => {
  if (isActiveReadOnly(state)) {
    return null;
  }

  return { mode: "edit" };
};

export const view = () => ({
  mode: "view"
});

export const clear = <Cell extends CellBase>(state: IStoreState<any>) => {
  if (!state.active) {
    return null;
  }

  const { row, column } = state.active;
  const cell = matrixGet(row, column, state.data);
  return {
    data: pointSetReduce(
      (acc, point) =>
        updateData(acc, {
          ...point,
          data: { ...cell, value: "" }
        }),
      state.selected,
      state.data
    ),
    ...commit(
      state,
      pointSetToArray(state.selected).map(point => {
        const cell = matrixGet(point.row, point.column, state.data);
        return {
          prevCell: cell,
          nextCell: { ...cell, value: "" }
        };
      })
    )
  };
};

export type KeyDownHandler<Cell extends CellBase> = (
  state: IStoreState<Cell>,
  event: KeyboardEvent
) => Partial<IStoreState<Cell>> | null;

export const go = <Cell extends CellBase>(
  rowDelta: number,
  columnDelta: number
): KeyDownHandler<any> => (state, event) => {
  if (!state.active) {
    return null;
  }
  const nextActive = {
    row: state.active.row + rowDelta,
    column: state.active.column + columnDelta
  };
  if (!matrixHas(nextActive.row, nextActive.column, state.data)) {
    return { mode: "view" };
  }
  return {
    active: nextActive,
    selected: pointSetFrom([nextActive]),
    mode: "view"
  };
};

export const modifyEdge = (field: keyof IPoint, delta: number) => (
  state: IStoreState<any>
) => {
  if (!state.active) {
    return null;
  }

  const edgeOffsets = pointSetHas(state.selected, {
    ...state.active,
    [field]: state.active[field] + delta * -1
  });

  const nextSelected = edgeOffsets
    ? pointSetShrinkEdge(state.selected, field, delta * -1)
    : pointSetExtendEdge(state.selected, field, delta);

  return {
    selected: pointSetFilter(
      point => matrixHas(point.row, point.column, state.data),
      nextSelected
    )
  };
};

export const blur = () => ({
  active: null
});

// Key Bindings

type KeyDownHandlers<Cell extends CellBase> = {
  [eventType: string]: KeyDownHandler<Cell>;
};

/** @todo handle inactive state? */
const keyDownHandlers: KeyDownHandlers<any> = {
  ArrowUp: go(-1, 0),
  ArrowDown: go(+1, 0),
  ArrowLeft: go(0, -1),
  ArrowRight: go(0, +1),
  Tab: go(0, +1),
  // TODO: Fix type here: edit() returns { mode: "edit" } | null which isn't a KeyDownHandlers
  Enter: edit as any,
  Backspace: clear,
  Escape: blur
};

const editKeyDownHandlers: KeyDownHandlers<any> = {
  Escape: view as KeyDownHandler<any>,
  Tab: keyDownHandlers.Tab,
  Enter: keyDownHandlers.ArrowDown
};

const shiftKeyDownHandlers: KeyDownHandlers<any> = {
  ArrowUp: modifyEdge("row", -1),
  ArrowDown: modifyEdge("row", 1),
  ArrowLeft: modifyEdge("column", -1),
  ArrowRight: modifyEdge("column", 1)
};

const shiftMetaKeyDownHandlers: KeyDownHandlers<any> = {};
const metaKeyDownHandlers: KeyDownHandlers<any> = {};

function getActive<Cell extends CellBase>(state: IStoreState<Cell>): any {
  return (
    state.active && matrixGet(state.active.row, state.active.column, state.data)
  );
}

const isActiveReadOnly = <Cell>(state: IStoreState<Cell>): boolean => {
  const activeCell = getActive(state);
  return Boolean(activeCell && activeCell.readOnly);
};

export function keyPress<Cell extends CellBase>(
  state: IStoreState<any>,
  _: KeyboardEvent
) {
  if (state.mode === "view" && state.active) {
    return { mode: "edit" };
  }
  return null;
}

export const getKeyDownHandler = <Cell extends CellBase>(
  state: IStoreState<any>,
  event: KeyboardEvent<HTMLInputElement>
) => {
  const { key } = event;
  let handlers;
  // Order matters
  if (state.mode === "edit") {
    handlers = editKeyDownHandlers;
  } else if (event.shiftKey && event.metaKey) {
    handlers = shiftMetaKeyDownHandlers;
  } else if (event.shiftKey) {
    handlers = shiftKeyDownHandlers;
  } else if (event.metaKey) {
    handlers = metaKeyDownHandlers;
  } else {
    handlers = keyDownHandlers;
  }
  return handlers[key];
};

export function keyDown(
  state: IStoreState<any>,
  event: KeyboardEvent<HTMLInputElement>
) {
  const handler = getKeyDownHandler(state, event);
  if (handler) {
    return handler(state, event);
  }
  return null;
}

export function dragStart<T>(state: IStoreState<T>) {
  return { dragging: true };
}

export function dragEnd<T>(state: IStoreState<T>) {
  return { dragging: false };
}

export function commit<T>(
  _: IStoreState<T>,
  changes: Array<{ prevCell: T | null; nextCell: T | null }>
) {
  return { lastCommit: changes };
}
