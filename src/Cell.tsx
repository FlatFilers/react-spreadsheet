import classnames from "classnames";
import React, { MouseEvent, PureComponent } from "react";
import { connect } from "unistore/react";

import { activate, select, setCellDimensions } from "./actions";
import { get as getMatrix } from "./matrix";
import { get, has as hasPointMap } from "./point-map";
import { has as hasPointSet } from "./point-set";
import {
  CellBase,
  DataViewer,
  getValue,
  IDimensions,
  IPoint,
  IStoreState,
  Mode
} from "./types";
import { getOffsetRect, isActive } from "./util";

export type StaticProps<Data, Value> = {
  row: number;
  column: number;
  DataViewer: DataViewer<Data, Value>;
  getValue: getValue<Data, Value>;
  formulaParser: any;
};

type State<Data> = {
  selected: boolean;
  active: boolean;
  copied: boolean;
  dragging: boolean;
  mode: Mode;
  data?: Data;
  _bindingChanged?: object;
};

type Handlers = {
  select: (cellPointer: IPoint) => void;
  activate: (cellPointer: IPoint) => void;
  setCellDimensions: (point: IPoint, dimensions: IDimensions) => void;
};

type Props<Data, Value> = StaticProps<Data, Value> & State<Data> & Handlers;

export class Cell<Data extends CellBase, Value> extends PureComponent<
  Props<Data, Value>
> {
  /** @todo update to new API */
  public root: HTMLElement | null = null;

  public handleRoot = (root: HTMLElement | null) => {
    this.root = root;
  };

  private handleMouseDown = (e: MouseEvent<HTMLTableCellElement>) => {
    const {
      row,
      column,
      setCellDimensions,
      select,
      activate,
      mode
    } = this.props;

    if (mode === "view") {
      setCellDimensions({ row, column }, getOffsetRect(e.currentTarget));

      if (e.shiftKey) {
        select({ row, column });
        return;
      }

      activate({ row, column });
    }
  };

  private handleMouseOver = (e: MouseEvent<HTMLTableCellElement>) => {
    const { row, column, dragging, setCellDimensions, select } = this.props;
    if (dragging) {
      setCellDimensions({ row, column }, getOffsetRect(e.currentTarget));
      select({ row, column });
    }
  };

  public componentDidUpdate() {
    const {
      row,
      column,
      active,
      selected,
      mode,
      setCellDimensions
    } = this.props;
    if (selected && this.root) {
      setCellDimensions({ row, column }, getOffsetRect(this.root));
    }
    if (this.root && active && mode === "view") {
      this.root.focus();
    }
  }

  public render() {
    const { row, column, getValue, formulaParser } = this.props;
    let { DataViewer, data } = this.props; // tslint:disable-line:prefer-const
    if (data && data.DataViewer) {
      DataViewer = data.DataViewer;
    }

    return (
      <td
        ref={this.handleRoot}
        className={classnames({
          readonly: data?.readOnly
        })}
        onMouseOver={this.handleMouseOver}
        onMouseDown={this.handleMouseDown}
        tabIndex={0}
      >
        <DataViewer
          row={row}
          column={column}
          cell={data}
          getValue={getValue}
          formulaParser={formulaParser}
        />
      </td>
    );
  }
}

function mapStateToProps<Data>(
  {
    data,
    active,
    selected,
    copied,
    mode,
    dragging,
    lastChanged,
    bindings
  }: IStoreState<Data>,
  { column, row }: Props<Data, any>
): State<Data> {
  const point = { row, column };
  const cellIsActive = isActive(active, point);

  const cellBindings = get(point, bindings);

  return {
    active: cellIsActive,
    selected: hasPointSet(selected, point),
    copied: hasPointMap(point, copied),
    mode: cellIsActive ? mode : "view",
    data: getMatrix(row, column, data),
    dragging,
    /** @todo refactor */
    _bindingChanged:
      cellBindings && lastChanged && hasPointSet(cellBindings, lastChanged)
        ? {}
        : undefined
  };
}

export const enhance = connect(mapStateToProps, () => ({
  select,
  activate,
  setCellDimensions
}));
