import {ComponentType, FC, PureComponent, ReactNode} from "react";

import { Matrix } from "./matrix";
import { PointMap } from "./point-map";
import { PointSet } from "./point-set";

export interface IPoint {
  column?: number;
  row?: number;
}

export type CellBase = {
  readOnly?: boolean;
  DataViewer?: DataViewer<any, any>;
  DataEditor?: DataEditor<any, any>;
};

export interface ICellDescriptor<Cell> extends IPoint {
  data?: Cell;
}

export type Mode = "view" | "edit";

export interface IDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface IStoreState<Cell> {
  data: Matrix<Cell>;
  selected: PointSet;
  copied: PointMap<boolean>;
  hasPasted: boolean;
  cut: boolean;
  active: IPoint | null;
  mode: Mode;
  rowDimensions: { [key: number]: { height: number; top: number } };
  columnDimensions: { [key: number]: { width: number; left: number } };
  dragging: boolean;
  lastChanged: IPoint | null;
  bindings: PointMap<PointSet>;
  lastCommit: null | Array<CellChange<Cell>>;
}

export type getValue<Cell, Value extends ReactNode> = (
  _: ICellDescriptor<Cell>
) => Value;

export type getBindingsForCell<Cell> = (cell: Cell) => IPoint[];

export type CellChange<Cell> = {
  prevCell?: Cell;
  nextCell?: Cell;
};

export type commit<Cell> = (changes: Array<CellChange<Cell>>) => void;

export interface ICellComponentProps<Cell, Value> extends IPoint {
  cell?: Cell;
  getValue: getValue<Cell, Value>;
  formulaParser?: any;
}

export type DataViewer<Cell, Value> = FC<ICellComponentProps<Cell, Value>>;

export type DataEditorProps<Cell, Value> = ICellComponentProps<Cell, Value> & {
  onChange: (_: Cell) => void;
};

export type DataEditor<Cell, Value> = ComponentType<
  DataEditorProps<Cell, Value>
>;
