import * as clipboard from "clipboard-polyfill";
import {
  columnIndexToLabel,
  Parser as FormulaParser
} from "hot-formula-parser";
import React, {
  Component,
  FC,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  SyntheticEvent
} from "react";
import { Store } from "unistore";
import { connect } from "unistore/react";

import {
  copy,
  cut,
  dragEnd,
  dragStart,
  getKeyDownHandler,
  keyDown,
  keyPress,
  paste
} from "./actions";
import ActiveCell from "./ActiveCell";
import { getBindingsForCell } from "./bindings";
import {
  Cell,
  enhance as enhancedCell,
  StaticProps as CellProps
} from "./Cell";
import Copied from "./Copied";
import DataEditor from "./DataEditor";
import DataViewer from "./DataViewer";
import {
  get as getMatrix,
  getSize,
  join as joinMatrix,
  map as mapMatrix,
  Matrix,
  slice,
  toArray
} from "./matrix";
import { max, min } from "./point-set";
import Row, { Props as RowProps } from "./Row";
import Selected from "./Selected";
import "./Spreadsheet.css";
import Table, { Props as TableProps } from "./Table";
import {
  CellBase,
  DataViewer as DataViewerType,
  getBindingsForCell as getBindingsForCellType,
  getValue,
  IStoreState,
  Mode
} from "./types";
import { range, writeTextToClipboard } from "./util";

type DefaultCellType = {
  value: string | number | boolean | null;
};

const getValue = ({ data }: { data?: DefaultCellType }) =>
  data ? data.value : null;

export type Props<CellType extends CellBase, Value> = {
  data: Matrix<CellType>;
  enhancedCell: any;
  columnLabels?: string[];
  ColumnIndicator?: FC<ColumnIndicatorProps>;
  rowLabels?: string[];
  RowIndicator?: FC<RowIndicatorProps>;
  hideRowIndicators?: boolean;
  hideColumnIndicators?: boolean;
  Table: FC<TableProps>;
  Row: FC<RowProps>;
  Cell: FC<CellProps<CellType, Value>>;
  DataViewer: DataViewerType<CellType, Value>;
  DataEditor: any; // DataEditorType<CellType, Value>;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  getValue: getValue<CellType, Value>;
  getBindingsForCell: getBindingsForCellType<CellType>;
  store: Store<any>;
};

type Handlers = {
  cut?: () => void;
  copy?: () => void;
  paste?: () => void;
  setDragging?: (_: boolean) => void;
  onKeyDownAction?: (_: SyntheticEvent<HTMLElement>) => void;
  onKeyPress?: (_: SyntheticEvent<HTMLElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

type State = {
  rows: number;
  columns: number;
  mode: Mode;
};

type ColumnIndicatorProps = {
  column: number;
  label?: ReactNode;
};

const DefaultColumnIndicator: FC<ColumnIndicatorProps> = ({ column, label }) =>
  label !== undefined ? (
    <th>{label}</th>
  ) : (
    <th>{columnIndexToLabel(column)}</th>
  );

type RowIndicatorProps = {
  row: number;
  label?: ReactNode;
};

const DefaultRowIndicator: FC<RowIndicatorProps> = ({ row, label }) =>
  label !== undefined ? <th>{label}</th> : <th>{row + 1}</th>;

interface ISpreadsheetProps<CellType, Value>
  extends Props<CellType, Value>,
    State,
    Handlers {
  data: Matrix<CellType>;
}

class Spreadsheet<CellType, Value> extends Component<
  ISpreadsheetProps<CellType, Value>
> {
  public static defaultProps = {
    Table,
    Row: Row as any,
    /** @todo enhance incoming Cell prop */
    Cell: enhancedCell(Cell) as any,
    DataViewer,
    DataEditor,
    getValue,
    getBindingsForCell
  };

  public formulaParser = new FormulaParser();

  /**
   * Internally used value to check if the copied text match the live objects
   * inside state.copied
   */
  // tslint:disable-next-line:variable-name
  public _clippedText: string | null = null;

  private clip = () => {
    const { store, getValue } = this.props;
    const { data, selected } = store.getState();
    const startPoint = min(selected);
    const endPoint = max(selected);
    const slicedMatrix = slice(startPoint, endPoint, data);
    const valueMatrix = mapMatrix((value, point) => {
      // Slice makes non-existing cells undefined, empty cells are classically
      // translated to an empty string in join()
      if (value === undefined) {
        return "";
      }
      return getValue({ ...point, data: value });
    }, slicedMatrix);
    const csv = joinMatrix(valueMatrix);
    this._clippedText = csv;
    writeTextToClipboard(csv);
  };

  private unclip = () => {
    this._clippedText = null;
  };

  private isFocused(): boolean {
    const { activeElement } = document;

    return this.props.mode === "view" && this.root
      ? this.root === activeElement || this.root.contains(activeElement)
      : false;
  }

  private handleCopy = (event: ClipboardEvent) => {
    if (this.isFocused()) {
      event.preventDefault();
      event.stopPropagation();
      this.clip();
      this.props.copy?.();
    }
  };

  private handlePaste = async (event: ClipboardEvent) => {
    if (this.props.mode === "view" && this.isFocused()) {
      event.preventDefault();
      event.stopPropagation();
      const text = await clipboard.readText();
      if (text === this._clippedText) {
        this.props.paste?.();
      } else {
        this.unclip();
      }
    }
  };

  private handleCut = (event: ClipboardEvent) => {
    if (this.isFocused()) {
      event.preventDefault();
      event.stopPropagation();
      this.clip();
      this.props.cut?.();
    }
  };

  public componentWillUnmount() {
    document.removeEventListener("cut", this.handleCut);
    document.removeEventListener("copy", this.handleCopy);
    document.removeEventListener("paste", this.handlePaste);
  }

  public componentDidMount() {
    const { store } = this.props;
    document.addEventListener("cut", this.handleCut);
    document.addEventListener("copy", this.handleCopy);
    document.addEventListener("paste", this.handlePaste);
    this.formulaParser.on(
      "callCellValue",
      (cellCoord: any, done: (_: ReactNode) => void) => {
        let value;
        /** @todo More sound error, or at least document */
        try {
          const cell: DefaultCellType = getMatrix(
            cellCoord.row.index,
            cellCoord.column.index,
            store.getState().data
          );
          value = getValue({ data: cell });
        } catch (error) {
          console.error(error);
        } finally {
          done(value);
        }
      }
    );
    this.formulaParser.on(
      "callRangeValue",
      (
        startCellCoord: any,
        endCellCoord: any,
        done: (_?: Array<string | number | boolean | null>) => void
      ) => {
        const startPoint = {
          row: startCellCoord.row.index,
          column: startCellCoord.column.index
        };
        const endPoint = {
          row: endCellCoord.row.index,
          column: endCellCoord.column.index
        };
        const values = toArray(
          slice(startPoint, endPoint, store.getState().data)
        ).map((cell: any) => getValue({ data: cell }));

        done(values);
      }
    );
  }

  private handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { store, onKeyDown, onKeyDownAction } = this.props;
    if (onKeyDown) {
      onKeyDown(event);
    }
    // Do not use event in case preventDefault() was called inside onKeyDown
    if (!event.defaultPrevented) {
      // Only disable default behavior if an handler exist
      if (getKeyDownHandler(store.getState(), event)) {
        event.nativeEvent.preventDefault();
      }
      onKeyDownAction?.(event);
    }
  };

  private handleMouseUp = () => {
    this.props.onDragEnd?.();
    document.removeEventListener("mouseup", this.handleMouseUp);
  };

  private handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!this.props.store.getState().dragging && event.buttons === 1) {
      this.props.onDragStart?.();
      document.addEventListener("mouseup", this.handleMouseUp);
    }
  };

  public root?: HTMLDivElement;

  public handleRoot = (root?: HTMLDivElement) => {
    this.root = root;
  };

  public render() {
    const {
      Table,
      Row,
      Cell,
      columnLabels,
      rowLabels,
      DataViewer,
      getValue,
      rows,
      columns,
      onKeyPress,
      getBindingsForCell,
      hideColumnIndicators,
      hideRowIndicators
    } = this.props;

    const ColumnIndicator =
      this.props.ColumnIndicator || DefaultColumnIndicator;
    const RowIndicator = this.props.RowIndicator || DefaultRowIndicator;

    return (
      <div
        ref={this.handleRoot}
        className="Spreadsheet"
        onKeyPress={onKeyPress}
        onKeyDown={this.handleKeyDown}
        onMouseMove={this.handleMouseMove}
      >
        <Table columns={columns} hideColumnIndicators={hideColumnIndicators}>
          <tr>
            {!hideRowIndicators && !hideColumnIndicators && <th />}
            {!hideColumnIndicators &&
              range(columns).map(columnNumber =>
                columnLabels ? (
                  <ColumnIndicator
                    key={columnNumber}
                    column={columnNumber}
                    label={
                      columnNumber in columnLabels
                        ? columnLabels[columnNumber]
                        : null
                    }
                  />
                ) : (
                  <ColumnIndicator key={columnNumber} column={columnNumber} />
                )
              )}
          </tr>
          {range(rows).map(rowNumber => (
            <Row key={rowNumber}>
              {!hideRowIndicators &&
                (rowLabels ? (
                  <RowIndicator
                    key={rowNumber}
                    row={rowNumber}
                    label={rowNumber in rowLabels ? rowLabels[rowNumber] : null}
                  />
                ) : (
                  <RowIndicator key={rowNumber} row={rowNumber} />
                ))}
              {range(columns).map(columnNumber => (
                <Cell
                  key={columnNumber}
                  row={rowNumber}
                  column={columnNumber}
                  DataViewer={DataViewer}
                  getValue={getValue}
                  formulaParser={this.formulaParser}
                />
              ))}
            </Row>
          ))}
        </Table>
        <ActiveCell
          // @ts-ignore
          DataEditor={DataEditor}
          getValue={getValue}
          getBindingsForCell={getBindingsForCell}
        />
        <Selected />
        <Copied />
      </div>
    );
  }
}

const mapStateToProps = (
  { data, mode }: IStoreState<any>,
  { columnLabels }: Props<any, any>
): State => {
  const { columns, rows } = getSize(data);
  return {
    mode,
    rows,
    columns: columnLabels ? Math.max(columns, columnLabels.length) : columns
  };
};

export default connect(mapStateToProps, {
  // copy,
  // cut,
  // paste,
  // onKeyDownAction: keyDown,
  // onKeyPress: keyPress,
  // onDragStart: dragStart,
  // onDragEnd: dragEnd
})(Spreadsheet);
